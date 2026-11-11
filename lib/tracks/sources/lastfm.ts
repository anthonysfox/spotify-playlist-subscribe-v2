import { sleep } from "utils/sleep";

const MIN_INTERVAL_MS = 250;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 2000;
const RETRYABLE = new Set([29, 11, 16]);
const TRACK_MIN_COUNT = 10;
const ARTIST_MIN_COUNT = 20;
const ARTIST_MAX_TAGS = 8;

export async function getTrackTags(
  title: string,
  artist: string,
): Promise<string[]> {
  return (await callLastfm("track.getTopTags", { track: title, artist }))
    .filter((tag) => tag.count >= TRACK_MIN_COUNT)
    .map((filtered) => filtered.name);
}

export async function getArtistTags(artist: string): Promise<string[]> {
  return (await callLastfm("artist.getTopTags", { artist }))
    .filter((tag) => tag.count >= ARTIST_MIN_COUNT)
    .slice(0, ARTIST_MAX_TAGS)
    .map((filtered) => filtered.name);
}

async function callLastfm(
  method: "track.getTopTags" | "artist.getTopTags",
  params: Record<string, string>,
): Promise<{ name: string; count: number }[]> {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) throw new Error("Missing Last FM API key");

  const query = new URLSearchParams({
    method,
    api_key: apiKey,
    format: "json",
    autocorrect: "1",
    ...params,
  });
  const url = `https://ws.audioscrobbler.com/2.0/?${query.toString()}`;

  for (let attempt = 0; ; attempt++) {
    await waitForSlot();
    const res = await fetch(url);
    const body = await res.json().catch(() => ({}));
    if (!res.ok && !body.error)
      throw new Error(`Last FM ${method} HTTP ${res.status}`);

    if (!body.error) {
      const raw = body.toptags?.tag ?? [];
      const list = Array.isArray(raw) ? raw : [raw];
      const tags = list.map(
        (tag: { count: number; name: string; url: string }) => ({
          name: tag.name,
          count: Number(tag.count),
        }),
      );

      return tags;
    }

    if (body.error === 6) return [];

    if (RETRYABLE.has(body.error) && attempt < MAX_RETRIES) {
      await sleep(BASE_BACKOFF_MS * 2 ** attempt);
      continue;
    }
    throw new Error(`Last FM ${method} error ${body.error}`);
  }
}

// Each caller reserves the next free slot synchronously, before awaiting, so
// concurrent callers get 0ms, 250ms, 500ms… instead of firing together.
let nextSlot = 0;

async function waitForSlot() {
  const now = Date.now();
  const start = Math.max(now, nextSlot);
  nextSlot = start + MIN_INTERVAL_MS;
  if (start > now) await sleep(start - now);
}
