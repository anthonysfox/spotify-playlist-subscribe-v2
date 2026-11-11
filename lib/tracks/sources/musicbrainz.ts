import { sleep } from "utils/sleep";

// MusicBrainz allows one request per second per IP, across every caller in this
// process, and rejects requests without an identifying User-Agent.
// https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting
const USER_AGENT = "PlaylistFox/1.0 ( https://anthonyfox.dev )";
const MIN_INTERVAL_MS = 1100;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 2000;

export interface MusicBrainzMatch {
  mbid: string;
  title: string;
  artists: string[];
  /** Raw tag names, most-voted first. Not cleaned — pass through cleanTags. */
  tags: string[];
}

interface MbTag {
  name: string;
  count: number;
}

interface MbRecording {
  id: string;
  title: string;
  "artist-credit"?: { name: string }[];
  tags?: MbTag[];
}

/**
 * Looks a track up on MusicBrainz by ISRC. Returns null when MusicBrainz
 * doesn't know the ISRC; throws when MusicBrainz itself fails.
 */
export async function lookupMusicBrainz(
  isrc: string,
): Promise<MusicBrainzMatch | null> {
  const res = await fetchMusicBrainz(
    `https://musicbrainz.org/ws/2/isrc/${encodeURIComponent(isrc)}?inc=artists+tags&fmt=json`,
  );

  // 400 = malformed ISRC, 404 = unknown ISRC. Both mean "no match", not failure.
  if (res.status === 400 || res.status === 404) return null;
  if (!res.ok) throw new Error(`MusicBrainz ${res.status} for ISRC ${isrc}`);

  const recordings: MbRecording[] = (await res.json()).recordings ?? [];
  if (recordings.length === 0) return null;

  // One ISRC can map to several recordings (remasters, compilations). The one
  // with the most tags carries the most signal.
  const best = recordings.reduce((a, b) =>
    (b.tags?.length ?? 0) > (a.tags?.length ?? 0) ? b : a,
  );

  return {
    mbid: best.id,
    title: best.title,
    artists: (best["artist-credit"] ?? []).map((a) => a.name),
    tags: [...(best.tags ?? [])]
      .sort((a, b) => b.count - a.count)
      .map((t) => t.name),
  };
}

/**
 * fetch with MusicBrainz's rate limit applied, retrying 503s (how MusicBrainz
 * signals rate limiting) with exponential backoff. Returns the last response
 * once retries run out; the caller decides what a non-OK status means.
 */
async function fetchMusicBrainz(url: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    await waitForSlot(); // a retry is a request too, so it takes its own slot
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });

    if (res.status !== 503 || attempt === MAX_RETRIES) return res;

    const backoff = BASE_BACKOFF_MS * 2 ** attempt;
    const retryAfter = Number(res.headers.get("Retry-After"));
    await res.body?.cancel();
    await sleep(
      Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.max(retryAfter * 1000, backoff)
        : backoff,
    );
  }
}

// Each caller reserves the next free slot synchronously, before awaiting, so
// concurrent callers get 0ms, 1100ms, 2200ms… instead of firing together.
let nextSlot = 0;

async function waitForSlot() {
  const now = Date.now();
  const start = Math.max(now, nextSlot);
  nextSlot = start + MIN_INTERVAL_MS;
  if (start > now) await sleep(start - now);
}
