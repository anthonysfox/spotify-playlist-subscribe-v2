import prisma from "../db/prisma";
import { getProvider } from "../music";
import type { DBVibeTrack } from "../music/types";
import { embedText } from "./embed";
import { resolveSpotifyIds } from "./spotify-ids";

// Hybrid search: ranks tracks by meaning (vector distance) and by exact words
// (Postgres full-text search on vibe_profile), then merges the two rankings
// with Reciprocal Rank Fusion: score = 1/(60 + rank) from each list, summed.
const CANDIDATES = 50;
const RRF_K = 60;

// Some matches won't be on Spotify for this user and get dropped, so fetch
// extra to still fill `limit`.
const OVERFETCH = 2;

type MatchedTrack = Omit<DBVibeTrack, "spotifyId">;

/**
 * Finds catalog tracks matching a vibe, with each track's Spotify id for the
 * user. When Spotify is connected, tracks it doesn't have are left out; when it
 * isn't, results come back with `spotifyId: null`.
 */
export async function searchTracksByVibe(
  userId: string,
  vibe: string,
  limit: number,
): Promise<DBVibeTrack[]> {
  const matches = await findMatches(vibe, limit * OVERFETCH);

  const client = await getProvider("SPOTIFY").forUser(userId);
  if (!client) {
    return matches.slice(0, limit).map((m) => ({ ...m, spotifyId: null }));
  }

  const ids = await resolveSpotifyIds(
    matches.map((m) => m.isrc),
    client,
  );
  return matches
    .filter((m) => ids.has(m.isrc))
    .slice(0, limit)
    .map((m) => ({ ...m, spotifyId: ids.get(m.isrc)! }));
}

async function findMatches(
  vibe: string,
  limit: number,
): Promise<MatchedTrack[]> {
  const vec = JSON.stringify(await embedText(vibe, "search"));

  return prisma.$queryRaw<MatchedTrack[]>`
    WITH semantic AS (
      SELECT isrc, ROW_NUMBER() OVER (ORDER BY embedding <=> ${vec}::vector) AS rank
      FROM tracks
      WHERE status = 'INDEXED'
      ORDER BY rank
      LIMIT ${CANDIDATES}
    ),
    keyword AS (
      SELECT isrc,
        ROW_NUMBER() OVER (
          ORDER BY ts_rank(to_tsvector('english', vibe_profile), websearch_to_tsquery('english', ${vibe})) DESC
        ) AS rank
      FROM tracks
      WHERE status = 'INDEXED'
        AND to_tsvector('english', vibe_profile) @@ websearch_to_tsquery('english', ${vibe})
      ORDER BY rank
      LIMIT ${CANDIDATES}
    )
    SELECT t.title, t.artist, t.isrc,
      1 - (t.embedding <=> ${vec}::vector) AS similarity
    FROM semantic s
    FULL OUTER JOIN keyword k ON k.isrc = s.isrc
    JOIN tracks t ON t.isrc = COALESCE(s.isrc, k.isrc)
    ORDER BY COALESCE(1.0 / (${RRF_K} + s.rank), 0) + COALESCE(1.0 / (${RRF_K} + k.rank), 0) DESC
    LIMIT ${limit}
  `;
}
