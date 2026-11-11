import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn<typeof fetch>();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

// Load a fresh copy of the module for every test (see below).
let lookupMusicBrainz: typeof import("@/lib/tracks/sources/musicbrainz").lookupMusicBrainz;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  vi.resetModules();
  ({ lookupMusicBrainz } = await import("@/lib/tracks/sources/musicbrainz"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const recording = (
  id: string,
  tags: { name: string; count: number }[] = [],
) => ({
  id,
  title: "Song",
  "artist-credit": [{ name: "Artist A" }, { name: "Artist B" }],
  tags,
});

describe("lookupMusicBrainz", () => {
  it("returns null for an unknown ISRC", async () => {
    fetchMock.mockResolvedValueOnce(json({}, 404));
    expect(await lookupMusicBrainz("XX0000000000")).toBeNull();
  });

  it("picks the recording with the most tags and sorts tags by votes", async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        recordings: [
          recording("r1", [{ name: "pop", count: 1 }]),
          recording("r2", [
            { name: "ambient", count: 1 },
            { name: "downtempo", count: 4 },
          ]),
        ],
      }),
    );

    expect(await lookupMusicBrainz("ISRC1")).toEqual({
      mbid: "r2",
      title: "Song",
      artists: ["Artist A", "Artist B"],
      tags: ["downtempo", "ambient"],
    });
  });

  it("retries a 503 after backing off", async () => {
    fetchMock
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json({ recordings: [recording("r1")] }));

    const pending = lookupMusicBrainz("ISRC1");

    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(1); // still backing off
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((await pending)?.mbid).toBe("r1");
  });

  it("throws after the last retry still gets a 503", async () => {
    fetchMock.mockImplementation(async () => json({}, 503));

    const pending = lookupMusicBrainz("ISRC1");

    const assertion = expect(pending).rejects.toThrow("503"); // attach first
    await vi.advanceTimersByTimeAsync(14_000);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("spaces concurrent lookups at least 1100ms apart", async () => {
    // Script the phones answers. Two lookups means two calls, so two answers, used in order. the contents dont matter for this test; they only need to be valid so both lookups finish without crashing
    fetchMock
      .mockResolvedValueOnce(json({ recordings: [recording("r1")] }))
      .mockResolvedValueOnce(json({ recordings: [recording("r2")] }));

    // start both lookups at the same moment, without awaiting either. awaiting call1 first would make call2 start only after call1 finished and the two would never compete for a slot. keep each promise to await at the end.
    const call1 = lookupMusicBrainz("ISRC1");
    const call2 = lookupMusicBrainz("ISRC2");

    // move the fake clock to 1ms before call2s turn. waitForSlot gave call1 the 0ms slot, so it calls straight away, and gave call2 the 1100ms slot, so its still sleeping. Moving the clock also lets call1's pending awaits run, which is why fetch has been called at all by this point
    await vi.advanceTimersByTimeAsync(1099);

    // check the notepad: only call1 has phoned so far. if the rate limiter were broken and both fired together, this would be 2 and the test fails
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // move the clock the last 1ms to 1100ms. call2s sleep ends and it phones
    await vi.advanceTimersByTimeAsync(1);

    // check the notepad again: now both have called. this proves call2 wasnt blocked forever, only made to wait its turn
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // wait for both lookups to fully finish, so nothing is still running when the test ends. if either had failed, this would throw and fail the test
    await Promise.all([call1, call2]);
  });
});
