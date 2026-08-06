import type { PlaylistTrack } from "@/lib/track-filters";

export interface PlaylistDescription {
  /** Most frequent artists on the playlist, best first — the "who's on this". */
  topArtists: string[];
  /** A few representative tracks spread across the list, as "Track — Artist". */
  sampleTracks: string[];
  trackCount: number;
}

/**
 * Turn a track list into a quick, human "what's this like" — no AI, no extra API
 * calls, just a read over tracks the caller already has. Top artists are the
 * recognizable signal ("oh, it's that kind of playlist"); the samples are spread
 * across the whole list rather than the top few so they represent it fairly.
 */
export function describePlaylist(
  tracks: PlaylistTrack[],
  opts?: { maxArtists?: number; maxSamples?: number },
): PlaylistDescription {
  const maxArtists = opts?.maxArtists ?? 5;
  const maxSamples = opts?.maxSamples ?? 3;

  const counts = new Map<string, number>();
  for (const track of tracks) {
    for (const artist of track.artists) {
      if (!artist) continue;
      counts.set(artist, (counts.get(artist) ?? 0) + 1);
    }
  }

  const topArtists = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxArtists)
    .map(([name]) => name);

  const sampleTracks = pickSpread(tracks, maxSamples).map(
    (track) => `${track.name} — ${track.artists.join(", ")}`,
  );

  return { topArtists, sampleTracks, trackCount: tracks.length };
}

/** Evenly spaced picks so samples represent the whole list, not just the start. */
function pickSpread<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items;
  const step = items.length / n;
  return Array.from({ length: n }, (_, i) => items[Math.floor(i * step)]);
}
