/**
 * Small utilities for testing a route handler in isolation.
 *
 * Note what is deliberately NOT here: the `vi.mock` calls. Vitest hoists
 * `vi.mock` to the top of the file it appears in, above the imports it needs to
 * intercept. Wrapped in a helper function it would run too late and the real
 * Clerk/Prisma modules would already be bound. So each test file declares its
 * own mocks at the top level — see subscribe-route.test.ts for the pattern.
 */

/** A `Request` shaped the way a route handler expects a JSON POST to look. */
export function jsonRequest(body: unknown, url = "http://localhost/api/test") {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Status plus parsed JSON body from a handler's Response, in one step. */
export async function readJson(response: Response) {
  return { status: response.status, body: await response.json() };
}

/** A minimal valid playlist reference, overridable per test. */
export function playlistRef(overrides: Record<string, unknown> = {}) {
  return {
    id: "37i9dQZF1DXcBWIGoYBM5M",
    name: "Today's Top Hits",
    imageUrl: null,
    trackCount: 50,
    ...overrides,
  };
}
