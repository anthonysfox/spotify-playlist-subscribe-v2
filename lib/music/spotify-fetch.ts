const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;
const MAX_JITTER_MS = 250;

// Spotify can ask for a wait of minutes or hours. Holding a serverless function
// open that long just burns its duration limit, so hand the 429 back instead.
const MAX_WAIT_MS = 30_000;

function retryDelayMs(response: Response, attempt: number): number {
  const backoff =
    BASE_BACKOFF_MS * 2 ** attempt + Math.random() * MAX_JITTER_MS;
  const retryAfterSeconds = Number(response.headers.get("Retry-After"));

  return Number.isFinite(retryAfterSeconds)
    ? Math.max(retryAfterSeconds * 1000, backoff)
    : backoff;
}

/**
 * `fetch` for the Spotify Web API that waits and retries on 429, using
 * `Retry-After` as the minimum wait and exponential backoff otherwise. Once it
 * gives up, the final 429 is returned for the caller to handle like any other
 * error response.
 */
export async function spotifyFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, init);

    if (response.status !== 429 || attempt === MAX_RETRIES) return response;

    const delay = retryDelayMs(response, attempt);
    if (delay > MAX_WAIT_MS) return response;

    await response.body?.cancel();
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
