import { beforeEach, describe, expect, it, vi } from "vitest";
import { playlistRef } from "./helpers/route";

/*
 * subscribe() with its collaborators faked, to pin down the immediate sync it
 * schedules once the subscription is saved.
 *
 * The bug this guards against: the sync was triggered with the caller's
 * PlaylistRef ids — Spotify/Apple ids — instead of the database ids the sync
 * engine filters on. For a new playlist that left `playlistId` undefined, and a
 * forced sync with no playlist or user filter selects every playlist in the
 * database.
 */
const { tx, mockPrisma, mockClient, mockTriggerSync, mockAfter } = vi.hoisted(
  () => {
    const tx = {
      managedPlaylist: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      sourcePlaylist: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      managedPlaylistSourceSubscription: { create: vi.fn() },
    };
    return {
      tx,
      mockPrisma: {
        $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
        managedPlaylist: { findUnique: vi.fn() },
      },
      mockClient: {
        capabilities: { removeTracks: true },
        createPlaylist: vi.fn(),
      },
      mockTriggerSync: vi.fn(),
      mockAfter: vi.fn(),
    };
  },
);

vi.mock("@/lib/db/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/music", () => ({
  getProvider: () => ({ forUser: async () => mockClient }),
}));
vi.mock("@/lib/user", () => ({
  ensureUser: async () => ({ timezone: "UTC" }),
}));
vi.mock("@/lib/audit-logger", () => ({
  AuditLogger: { logSubscriptionCreated: vi.fn() },
}));
vi.mock("@/lib/sync/trigger", () => ({ triggerSync: mockTriggerSync }));
vi.mock("next/server", () => ({ after: mockAfter }));

import { subscribe } from "@/lib/playlists/subscribe";

const USER = "user_1";
// Database ids — what the sync engine filters on.
const DB_MANAGED_ID = "db-managed-1";
const DB_SOURCE_ID = "db-source-1";
// Provider ids — what callers pass in. These must never reach triggerSync.
const SPOTIFY_MANAGED_ID = "spotify-managed-xyz";
const SPOTIFY_SOURCE_ID = "37i9dQZF1DXcBWIGoYBM5M";

/** Runs the callback subscribe() handed to after(), and returns its result. */
async function runScheduledWork() {
  expect(mockAfter).toHaveBeenCalledTimes(1);
  const callback = mockAfter.mock.calls[0][0];
  const returned = callback();
  // after() only keeps the function alive for a promise the callback returns.
  // A callback with `{ ... }` and no `return` gives undefined, and the request
  // can be cut off when the response is sent.
  expect(returned).toBeInstanceOf(Promise);
  return returned;
}

describe("subscribe() immediate sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTriggerSync.mockResolvedValue({ success: true });

    tx.managedPlaylist.findFirst.mockResolvedValue(null);
    tx.managedPlaylist.create.mockResolvedValue({ id: DB_MANAGED_ID });
    tx.managedPlaylist.update.mockResolvedValue({ id: DB_MANAGED_ID });
    tx.sourcePlaylist.findFirst.mockResolvedValue(null);
    tx.sourcePlaylist.create.mockResolvedValue({ id: DB_SOURCE_ID });
    tx.sourcePlaylist.update.mockResolvedValue({ id: DB_SOURCE_ID });
    tx.managedPlaylistSourceSubscription.create.mockResolvedValue({
      id: "sub-1",
    });
    mockPrisma.managedPlaylist.findUnique.mockResolvedValue({
      id: DB_MANAGED_ID,
    });
    mockClient.createPlaylist.mockResolvedValue(
      playlistRef({ id: SPOTIFY_MANAGED_ID, name: "Fresh", trackCount: 0 }),
    );
  });

  it("syncs a newly created playlist by its database ids, scoped to the user", async () => {
    await subscribe({
      userId: USER,
      sourcePlaylist: playlistRef({ id: SPOTIFY_SOURCE_ID }),
      newPlaylistName: "Fresh",
    });
    await runScheduledWork();

    expect(mockTriggerSync).toHaveBeenCalledWith({
      playlistId: DB_MANAGED_ID,
      sourceId: DB_SOURCE_ID,
      userId: USER,
      force: true,
    });
  });

  it("syncs an existing destination by its database id, not the provider id", async () => {
    tx.managedPlaylist.findFirst.mockResolvedValue({ id: DB_MANAGED_ID });

    await subscribe({
      userId: USER,
      sourcePlaylist: playlistRef({ id: SPOTIFY_SOURCE_ID }),
      managedPlaylist: playlistRef({
        id: SPOTIFY_MANAGED_ID,
        name: "Mine",
      }),
    });
    await runScheduledWork();

    const opts = mockTriggerSync.mock.calls[0][0];
    expect(opts.playlistId).toBe(DB_MANAGED_ID);
    expect(opts.sourceId).toBe(DB_SOURCE_ID);
    expect(opts.userId).toBe(USER);
  });

  it("schedules the sync only after the transaction has committed", async () => {
    mockPrisma.$transaction.mockImplementationOnce(async (fn) => {
      const result = await fn(tx);
      // Still inside the transaction: nothing may have been scheduled yet.
      expect(mockAfter).not.toHaveBeenCalled();
      return result;
    });

    await subscribe({
      userId: USER,
      sourcePlaylist: playlistRef(),
      newPlaylistName: "Fresh",
    });

    expect(mockAfter).toHaveBeenCalledTimes(1);
  });

  it("does not schedule a sync when runImmediateSync is false", async () => {
    await subscribe({
      userId: USER,
      sourcePlaylist: playlistRef(),
      newPlaylistName: "Fresh",
      runImmediateSync: false,
    });

    expect(mockAfter).not.toHaveBeenCalled();
    expect(mockTriggerSync).not.toHaveBeenCalled();
  });

  it("swallows a failed sync so the subscription still succeeds", async () => {
    mockTriggerSync.mockRejectedValue(new Error("Sync failed: 504"));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const result = await subscribe({
      userId: USER,
      sourcePlaylist: playlistRef(),
      newPlaylistName: "Fresh",
    });
    await expect(runScheduledWork()).resolves.toBeUndefined();

    expect(result.subscriptionId).toBe("sub-1");
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
