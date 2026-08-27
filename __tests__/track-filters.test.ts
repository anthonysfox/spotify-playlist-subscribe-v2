import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import {
  canonicalTitle,
  rotateUnseen,
  songIdentity,
  withinAgeLimit,
  withoutExplicit,
  type PlaylistTrack,
} from "@/lib/track-filters";
import {
  calculateNextCustomRun,
  calculateNextSyncTime,
  SyncScheduleOptions,
} from "utils/sync-schedule";

function track(overrides: Partial<PlaylistTrack> = {}): PlaylistTrack {
  return {
    id: "id-1",
    name: "Song Title",
    artists: ["Artist"],
    explicit: false,
    addedAt: null,
    ...overrides,
  };
}

describe("canonicalTitle", () => {
  it("strips remaster/reissue noise from a trailing ' - suffix'", () => {
    expect(canonicalTitle("Bohemian Rhapsody - 2011 Remaster")).toBe(
      "bohemian rhapsody",
    );
  });

  it("strips featuring credits out of parentheses", () => {
    expect(canonicalTitle("Blinding Lights (feat. Rosalía)")).toBe(
      "blinding lights",
    );
  });

  it("keeps a genuinely distinct version like a remix", () => {
    expect(canonicalTitle("Song (Kaytranada Remix)")).toBe(
      "song kaytranada remix",
    );
  });

  it("treats the two spellings of the same song as identical after normalizing", () => {
    expect(canonicalTitle("Song (Kaytranada Remix)")).toBe(
      canonicalTitle("SONG (Kaytranada Remix)"),
    );
  });
});

describe("songIdentity", () => {
  it("collapses two releases of the same song to one identity", () => {
    const original = track({ name: "Bohemian Rhapsody", artists: ["Queen"] });
    const remaster = track({
      name: "Bohemian Rhapsody - 2011 Remaster",
      artists: ["Queen"],
    });

    expect(songIdentity(original)).toBe(songIdentity(remaster));
  });

  it("does not split one song into two over differing feat. credits", () => {
    const solo = track({ name: "Song", artists: ["Artist"] });
    const withFeature = track({
      name: "Song (feat. Someone Else)",
      artists: ["Artist"],
    });

    expect(songIdentity(solo)).toBe(songIdentity(withFeature));
  });

  it("treats a remix as a different song from the original", () => {
    const original = track({ name: "Song", artists: ["Artist"] });
    const remix = track({
      name: "Song (Kaytranada Remix)",
      artists: ["Artist"],
    });

    expect(songIdentity(original)).not.toBe(songIdentity(remix));
  });
});

describe("rotateUnseen", () => {
  const candidates = [
    track({ id: "1", name: "Song One" }),
    track({ id: "2", name: "Song Two" }),
    track({ id: "3", name: "Song Three" }),
  ];

  it("returns only unseen tracks when enough remain, and is not exhausted", () => {
    const alreadyServed = new Set([songIdentity(candidates[0])]);

    const { pool, exhausted } = rotateUnseen(candidates, alreadyServed, 2);

    expect(pool.map((t) => t.id)).toEqual(["2", "3"]);
    expect(exhausted).toBe(false);
  });

  it("restarts the cycle once the source is fully served, unseen tracks first", () => {
    const alreadyServed = new Set([
      songIdentity(candidates[0]),
      songIdentity(candidates[1]),
    ]);

    // Only "3" is unseen, but the caller wants 2 — not enough left, so the
    // cycle should restart rather than starving the sync.
    const { pool, exhausted } = rotateUnseen(candidates, alreadyServed, 2);

    expect(exhausted).toBe(true);
    expect(pool.map((t) => t.id)).toEqual(["3", "1", "2"]);
  });
});

describe("withoutExplicit", () => {
  it("drops explicit tracks and keeps the rest", () => {
    const clean = track({ id: "clean", explicit: false });
    const explicit = track({ id: "explicit", explicit: true });

    expect(withoutExplicit([clean, explicit])).toEqual([clean]);
  });
});

describe("withinAgeLimit", () => {
  it("disables the filter when days <= 0", () => {
    const old = track({ addedAt: "2000-01-01T00:00:00.000Z" });

    expect(withinAgeLimit([old], 0)).toEqual([old]);
  });

  it("drops tracks added before the cutoff", () => {
    const recent = track({ id: "recent", addedAt: new Date().toISOString() });
    const old = track({ id: "old", addedAt: "2000-01-01T00:00:00.000Z" });

    expect(withinAgeLimit([recent, old], 30)).toEqual([recent]);
  });

  it("keeps tracks with a missing or unparseable addedAt rather than dropping them", () => {
    const missing = track({ id: "missing", addedAt: null });
    const unparseable = track({ id: "bad-date", addedAt: "not-a-date" });

    expect(withinAgeLimit([missing, unparseable], 30)).toEqual([
      missing,
      unparseable,
    ]);
  });
});

describe("calculateNextSyncTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-26T00:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("DAILY advances to the next UTC midnight", () => {
    expect(calculateNextSyncTime("DAILY")).toEqual(
      new Date("2026-08-27T00:00:00Z"),
    );
  });

  it("WEEKLY advances to the next UTC midnight a week from now", () => {
    expect(calculateNextSyncTime("WEEKLY")).toEqual(
      new Date("2026-09-02T00:00:00Z"),
    );
  });

  it("MONTHLY advances to the next UTC midnight a month from now", () => {
    expect(calculateNextSyncTime("MONTHLY")).toEqual(
      new Date("2026-09-26T00:00:00Z"),
    );
  });

  it("CUSTOM advances to the next UTC midnight a month from custom date", () => {
    const options: SyncScheduleOptions = {
      customDays: ["monday", "wednesday", "friday"],
    };
    expect(calculateNextSyncTime("CUSTOM", options)).toEqual(
      new Date("2026-08-28T00:00:00Z"),
    );
  });
});

describe("calculateNextCustomRun", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-26T00:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("sets the next sync date based on the custom days set", () => {
    expect(calculateNextCustomRun(["monday"], "00:00")).toEqual(
      new Date("2026-08-31T00:00:00Z"),
    );
  });
});
