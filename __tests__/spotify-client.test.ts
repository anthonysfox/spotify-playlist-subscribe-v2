import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSpotifyClient } from "@/lib/music/spotify";
import { spotifyFetch } from "@/lib/music/spotify-fetch";

const BASE = "https://api.test/v1";

const json = (body: unknown, status = 200, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), { status, headers });

const fetchMock = vi.fn<typeof fetch>();
const calledUrl = (call: number) => String(fetchMock.mock.calls[call][0]);
const calledInit = (call: number) => fetchMock.mock.calls[call][1];

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("BASE_SPOTIFY_URL", BASE);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("spotifyFetch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("waits for Retry-After before retrying a 429", async () => {
    fetchMock
      .mockResolvedValueOnce(json({}, 429, { "Retry-After": "5" }))
      .mockResolvedValueOnce(json({ ok: true }));

    const pending = spotifyFetch(`${BASE}/me`);

    await vi.advanceTimersByTimeAsync(4999);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((await pending).status).toBe(200);
  });

  it("backs off exponentially when there is no Retry-After", async () => {
    fetchMock.mockImplementation(async () => json({}, 429));

    const pending = spotifyFetch(`${BASE}/me`);

    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(251);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(251);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(4251);
    expect(fetchMock).toHaveBeenCalledTimes(4);

    // Out of retries: the last 429 goes back to the caller.
    expect((await pending).status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("returns the 429 instead of waiting out a very long Retry-After", async () => {
    fetchMock.mockResolvedValueOnce(json({}, 429, { "Retry-After": "3600" }));

    expect((await spotifyFetch(`${BASE}/me`)).status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("SpotifyClient", () => {
  const client = createSpotifyClient("token");

  it("reads tracks from /items, following absolute next links", async () => {
    fetchMock
      .mockResolvedValueOnce(
        json({
          items: [
            {
              added_at: "2026-01-01T00:00:00Z",
              item: {
                id: "t1",
                name: "One",
                explicit: true,
                artists: [{ name: "A" }],
                external_ids: { isrc: "ISRC1" },
              },
            },
          ],
          next: `${BASE}/playlists/p1/items?offset=50`,
        }),
      )
      .mockResolvedValueOnce(
        json({ items: [{ item: { id: "t2", name: "Two" } }], next: null }),
      );

    const tracks = await client.getPlaylistTracks("p1");

    expect(calledUrl(0)).toContain(`${BASE}/playlists/p1/items?`);
    expect(calledUrl(0)).toContain("item(id,");
    expect(calledUrl(1)).toBe(`${BASE}/playlists/p1/items?offset=50`);
    expect(calledInit(1)?.headers).toMatchObject({
      Authorization: "Bearer token",
    });
    expect(tracks.map((t) => t.id)).toEqual(["t1", "t2"]);
    expect(tracks[0]).toMatchObject({
      name: "One",
      artists: ["A"],
      explicit: true,
      isrc: "ISRC1",
    });
  });

  it("falls back to /tracks when /items is forbidden", async () => {
    fetchMock.mockResolvedValueOnce(json({}, 403)).mockResolvedValueOnce(
      json({
        items: [{ track: { id: "t1", name: "One" } }],
        next: null,
      }),
    );

    const tracks = await client.getPlaylistTracks("someone-elses");

    expect(calledUrl(1)).toContain(`${BASE}/playlists/someone-elses/tracks?`);
    expect(calledUrl(1)).toContain("track(id,");
    expect(tracks.map((t) => t.id)).toEqual(["t1"]);
  });

  it("throws when both track endpoints are forbidden", async () => {
    fetchMock.mockImplementation(async () => json({}, 403));

    await expect(client.getPlaylistTracks("p1")).rejects.toThrow("403");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("adds tracks through /items", async () => {
    fetchMock.mockResolvedValueOnce(json({ snapshot_id: "s" }, 201));

    await client.addTracks("p1", ["t1"]);

    expect(calledUrl(0)).toBe(`${BASE}/playlists/p1/items`);
    expect(calledInit(0)?.method).toBe("POST");
    expect(calledInit(0)?.body).toBe(
      JSON.stringify({ uris: ["spotify:track:t1"] }),
    );
  });

  it("creates playlists through /me/playlists", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ id: "p1", name: "New", items: { total: 0 } }, 201),
    );

    const playlist = await client.createPlaylist("New");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(calledUrl(0)).toBe(`${BASE}/me/playlists`);
    expect(calledInit(0)?.method).toBe("POST");
    expect(playlist).toMatchObject({ id: "p1", name: "New", trackCount: 0 });
  });

  it("reads the track count from items, then the deprecated tracks field", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ id: "a", items: { total: 7 } }))
      .mockResolvedValueOnce(json({ id: "b", tracks: { total: 9 } }));

    expect((await client.getPlaylist("a"))?.trackCount).toBe(7);
    expect((await client.getPlaylist("b"))?.trackCount).toBe(9);
  });

  describe("searchPlaylists", () => {
    const page = (ids: (string | null)[], next: string | null) =>
      json({
        playlists: {
          items: ids.map((id) => (id ? { id, name: id } : null)),
          next,
        },
      });
    const ids = (from: number, count: number) =>
      Array.from({ length: count }, (_, i) => `p${from + i}`);

    it("splits a large limit into pages within Spotify's maximum", async () => {
      fetchMock
        .mockResolvedValueOnce(page(ids(0, 10), "more"))
        .mockResolvedValueOnce(page(ids(10, 10), "more"))
        .mockResolvedValueOnce(page(ids(20, 4), "more"));

      const results = await client.searchPlaylists("chill", 24, 5);

      expect(results).toHaveLength(24);
      expect(calledUrl(0)).toContain("limit=10&offset=5");
      expect(calledUrl(1)).toContain("limit=10&offset=15");
      expect(calledUrl(2)).toContain("limit=4&offset=25");
    });

    it("stops when there are no more results", async () => {
      fetchMock.mockResolvedValueOnce(page(ids(0, 3), null));

      expect(await client.searchPlaylists("chill", 20)).toHaveLength(3);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("drops nulls but counts them towards the next offset", async () => {
      fetchMock
        .mockResolvedValueOnce(page(["a", null, ...ids(0, 8)], "more"))
        .mockResolvedValueOnce(page(["b"], null));

      const results = await client.searchPlaylists("chill", 11);

      expect(results).toHaveLength(10);
      expect(calledUrl(1)).toContain("limit=1&offset=10");
    });

    it("keeps earlier pages when a later page fails", async () => {
      fetchMock
        .mockResolvedValueOnce(page(ids(0, 10), "more"))
        .mockResolvedValueOnce(json({}, 500));

      expect(await client.searchPlaylists("chill", 20)).toHaveLength(10);
    });
  });
});
