import prisma from "../db/prisma";
import type { MusicClient } from "../music/types";

// Spotify's terms limit how long we keep their content, so track ids live in a
// cache with an expiry instead of on the track row. Tracks that are still in
// someone's sync get re-cached on every run, so in practice only tracks nobody
// syncs any more expire.
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const expiry = () => new Date(Date.now() + CACHE_TTL_MS);

/**
 * Writes isrc → Spotify track id pairs to the cache, refreshing the expiry of
 * any that are already there. One query however many pairs there are.
 */
export async function cacheSpotifyIds(
  pairs: { isrc: string; spotifyTrackId: string }[],
): Promise<void> {
  if (pairs.length === 0) return;

  // unnest turns the two arrays into rows: (isrcs[0], ids[0]), (isrcs[1], ids[1])…
  await prisma.$executeRaw`
    INSERT INTO spotify_track_cache (isrc, spotify_track_id, expires_at)
    SELECT isrc, spotify_track_id, ${expiry()}
    FROM unnest(${pairs.map((p) => p.isrc)}::text[], ${pairs.map((p) => p.spotifyTrackId)}::text[])
      AS t(isrc, spotify_track_id)
    ON CONFLICT (isrc) DO UPDATE SET
      spotify_track_id = EXCLUDED.spotify_track_id,
      expires_at = EXCLUDED.expires_at
  `;
}

/**
 * Maps ISRCs to Spotify track ids: unexpired cache hits first, then a
 * `/search?q=isrc:` lookup for each miss. ISRCs Spotify doesn't have (or that
 * aren't available to this user) are left out of the result.
 */
export async function resolveSpotifyIds(
  isrcs: string[],
  client: MusicClient,
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  if (isrcs.length === 0) return ids;

  const cached = await prisma.spotifyTrackCache.findMany({
    where: { isrc: { in: isrcs }, expiresAt: { gt: new Date() } },
    select: { isrc: true, spotifyTrackId: true },
  });
  for (const row of cached) ids.set(row.isrc, row.spotifyTrackId);

  const found: { isrc: string; spotifyTrackId: string }[] = [];

  // One at a time: a burst of parallel searches is how you earn a 429.
  for (const isrc of isrcs) {
    if (ids.has(isrc)) continue;

    const [track] = await client.searchTracks(`isrc:${isrc}`, 1);
    // No result can also mean the search failed (searchTracks returns [] on
    // errors), so misses are never cached — a later call will try again.
    if (!track) continue;

    ids.set(isrc, track.id);
    found.push({ isrc, spotifyTrackId: track.id });
  }

  await cacheSpotifyIds(found);
  return ids;
}
