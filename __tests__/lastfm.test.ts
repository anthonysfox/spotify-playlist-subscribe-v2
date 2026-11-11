import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn<typeof fetch>();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

// load a fresh copy of the module for every test
let getTrackTags: typeof import("@/lib/tracks/sources/lastfm").getTrackTags;
let getArtistTags: typeof import("@/lib/tracks/sources/lastfm").getArtistTags;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("LASTFM_API_KEY", "test-key");
  fetchMock.mockReset();
  vi.resetModules();
  ({ getTrackTags, getArtistTags } =
    await import("@/lib/tracks/sources/lastfm"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("getTrackTags", () => {
  it("drops tags below 10 and keeps order", async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        toptags: {
          tag: [
            { name: "ambient", count: 30 },
            { name: "instrumental", count: 10 },
            { name: "rock", count: 9 },
          ],
        },
      }),
    );

    expect(await getTrackTags("Song title", "ArtistA")).toEqual([
      "ambient",
      "instrumental",
    ]);
  });
});

describe("getArtistTags", () => {
  it("drops tags below 20 and caps at 8", async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        toptags: {
          tag: [
            { name: "rock", count: 100 },
            { name: "indie", count: 90 },
            { name: "alternative", count: 80 },
            { name: "indie rock", count: 70 },
            { name: "britpop", count: 60 },
            { name: "post-punk", count: 50 },
            { name: "new wave", count: 40 },
            { name: "shoegaze", count: 35 }, // 8th → kept
            { name: "dream pop", count: 10 }, // 9th → dropped
            { name: "noise pop", count: 5 }, // 10th → dropped
          ],
        },
      }),
    );

    expect(await getArtistTags("ArtistA")).toEqual([
      "rock",
      "indie",
      "alternative",
      "indie rock",
      "britpop",
      "post-punk",
      "new wave",
      "shoegaze",
    ]);
  });
});

describe("Last.fm requests", () => {
  it("spaces concurrent lookups at least 250ms apart", async () => {
    // Script the phones answers. Two lookups means two calls, so two answers, used in order. the contents dont matter for this test; they only need to be valid so both lookups finish without crashing
    fetchMock
      .mockResolvedValueOnce(
        json({
          toptags: {
            tag: [],
          },
        }),
      )
      .mockResolvedValueOnce(
        json({
          toptags: {
            tag: [],
          },
        }),
      );

    // start both lookups at the same moment, without awaiting either. awaiting call1 first would make call2 start only after call1 finished and the two would never compete for a slot. keep each promise to await at the end.
    const call1 = getTrackTags("Song title 1", "Artist A");
    const call2 = getTrackTags("Song title 2", "Artist B");

    // move the fake clock to 1ms before call2s turn. waitForSlot gave call1 the 0ms slot, so it calls straight away, and gave call2 the 250ms slot, so its still sleeping. Moving the clock also lets call1's pending awaits run, which is why fetch has been called at all by this point
    await vi.advanceTimersByTimeAsync(249);

    // check the notepad: only call1 has phoned so far. if the rate limiter were broken and both fired together, this would be 2 and the test fails
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // move the clock the last 1ms to 250ms. call2s sleep ends and it phones
    await vi.advanceTimersByTimeAsync(1);

    // check the notepad again: now both have called. this proves call2 wasnt blocked forever, only made to wait its turn
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // wait for both lookups to fully finish, so nothing is still running when the test ends. if either had failed, this would throw and fail the test
    await Promise.all([call1, call2]);
  });

  it("returns an empty array for error 6", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 6 }));

    expect(await getTrackTags("Track title", "Artist")).toStrictEqual([]);
  });

  it("retries for error 29", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 29 })).mockResolvedValueOnce(
      json({
        toptags: {
          tag: [
            { name: "ambient", count: 30 },
            { name: "instrumental", count: 10 },
            { name: "rock", count: 9 },
          ],
        },
      }),
    );

    const pending = getTrackTags("Track1", "Artist A");

    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await pending).toEqual(["ambient", "instrumental"]);
  });

  it("returns the tag when its only a single object not in an array", async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        toptags: {
          tag: { name: "ambient", count: 30 },
        },
      }),
    );

    expect(await getTrackTags("Song title", "ArtistA")).toEqual(["ambient"]);
  });

  it("throws for error 10 for invalid api key", async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        error: 10,
        message: "Invalid api key",
      }),
    );

    await expect(getTrackTags("Title1", "ArtistA")).rejects.toThrow(
      "Last FM track.getTopTags error 10",
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
