/**
 * Track filtering and song-identity helpers for the sync engine.
 *
 * None of this calls an AI model — it's plain string work and date math. It
 * exists because the sync engine used to fetch nothing but track IDs, which
 * made it impossible to honour the explicit/age settings or notice that the
 * same song had already been added under a different ID.
 */

export interface PlaylistTrack {
  /** Spotify track ID. */
  id: string;
  name: string;
  artists: string[];
  explicit: boolean;
  /** When the track was added to the playlist it came from (ISO 8601). */
  addedAt: string | null;
}

/**
 * Parenthetical/bracket/trailing-dash suffixes that mark the *same recording*
 * under a different release — a remaster, a radio edit, the "album version".
 * These get stripped so the two collapse to one song.
 */
const REISSUE_NOISE =
  /^(?:\d{4}\s+)?(?:digital\s+)?(?:remaster(?:ed)?(?:\s+version)?(?:\s+\d{4})?|re-?master(?:ed)?|radio\s+edit|radio\s+mix|single\s+version|album\s+version|lp\s+version|original\s+mix|original\s+version|deluxe(?:\s+edition)?|expanded(?:\s+edition)?|bonus\s+track|explicit(?:\s+version)?|clean(?:\s+version)?|mono(?:\s+version)?|stereo(?:\s+version)?|\d+(?:th|st|nd|rd)\s+anniversary(?:\s+edition)?)$/i;

/**
 * Featuring credits belong to the artist list, not the title — Spotify is
 * inconsistent about which one they land in, so they're always stripped.
 */
const FEATURING = /^(?:feat|ft|featuring|with)\b/i;

/**
 * Suffixes we deliberately KEEP, because they denote a genuinely different
 * recording that a listener would not call a duplicate: a remix, a live cut,
 * an acoustic take. Being conservative here matters — wrongly collapsing these
 * silently drops music the user wanted.
 */
function isDistinctVersion(segment: string): boolean {
  return /\b(remix|live|acoustic|demo|instrumental|cover|reprise|unplugged|edit)\b/i.test(
    segment,
  );
}

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Reduce a title to the song underneath it.
 *
 * "Bohemian Rhapsody - 2011 Remaster"  -> "bohemian rhapsody"
 * "Blinding Lights (feat. Rosalía)"     -> "blinding lights"
 * "Song (Kaytranada Remix)"             -> "song kaytranada remix"   (kept: different recording)
 */
export function canonicalTitle(rawTitle: string): string {
  let title = stripAccents(rawTitle);

  // Pull out "(...)" / "[...]" segments and any " - suffix" tail, deciding for
  // each whether it's release noise or a real variant.
  const kept: string[] = [];

  title = title.replace(/[\(\[]([^\)\]]*)[\)\]]/g, (_match, inner: string) => {
    const segment = inner.trim();

    if (REISSUE_NOISE.test(segment) || FEATURING.test(segment)) return " ";
    if (isDistinctVersion(segment)) kept.push(segment);

    // Anything unrecognised is kept too — better a missed dedupe than a
    // dropped song.
    else if (segment) kept.push(segment);

    return " ";
  });

  // Trailing " - Something" (Spotify's usual home for remaster tags).
  title = title.replace(/\s+-\s+([^-]+)$/, (_match, inner: string) => {
    const segment = inner.trim();

    if (REISSUE_NOISE.test(segment) || FEATURING.test(segment)) return " ";
    if (segment) kept.push(segment);

    return " ";
  });

  const base = [title, ...kept].join(" ");

  return base
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A stable identity for "the same song", independent of which release it came
 * from. Keyed on the primary artist so that differing "feat." credits between
 * two playlists don't split one song into two.
 */
export function songIdentity(track: PlaylistTrack): string {
  const primaryArtist = stripAccents(track.artists[0] ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  return `${primaryArtist}::${canonicalTitle(track.name)}`;
}

/**
 * Order candidates for a REPLACE-mode sync so each run serves *fresh* songs.
 *
 * REPLACE empties the playlist on every sync, which destroys the only record of
 * what had already been served. Left to itself the engine then re-picks the same
 * first N tracks from the source forever, and "replace" swaps the playlist for
 * an identical one. `alreadyServed` is that missing memory.
 *
 * Returns the candidates to choose from, unseen ones first. Once the source has
 * been served in full, the rotation starts over — signalled by `exhausted`, so
 * the caller knows to reset its memory.
 */
export function rotateUnseen(
  candidates: PlaylistTrack[],
  alreadyServed: ReadonlySet<string>,
  limit: number,
): { pool: PlaylistTrack[]; exhausted: boolean } {
  const unseen = candidates.filter(
    (track) => !alreadyServed.has(songIdentity(track)),
  );

  // Still enough unplayed material to fill this run.
  if (unseen.length >= limit) return { pool: unseen, exhausted: false };

  // The source has been rotated through. Begin again — but keep whatever is
  // genuinely still unseen at the front, so those tracks aren't skipped as the
  // cycle turns over.
  const unseenIds = new Set(unseen.map(songIdentity));

  return {
    pool: [
      ...unseen,
      ...candidates.filter((track) => !unseenIds.has(songIdentity(track))),
    ],
    exhausted: true,
  };
}

/** Drop tracks Spotify flags as explicit. */
export function withoutExplicit(tracks: PlaylistTrack[]): PlaylistTrack[] {
  return tracks.filter((track) => !track.explicit);
}

/**
 * Keep only tracks added to their source playlist within the last `days`.
 * `days <= 0` means "no limit", matching the existing settings UI.
 *
 * Tracks with no added_at are kept — an unknown date is not evidence of being
 * old, and silently dropping them would be worse than letting them through.
 */
export function withinAgeLimit(tracks: PlaylistTrack[], days: number): PlaylistTrack[] {
  if (!days || days <= 0) return tracks;

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  return tracks.filter((track) => {
    if (!track.addedAt) return true;

    const addedAt = Date.parse(track.addedAt);
    if (Number.isNaN(addedAt)) return true;

    return addedAt >= cutoff;
  });
}
