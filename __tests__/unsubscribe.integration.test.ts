import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { unsubscribe, UnsubscribeError } from "@/lib/unsubscribe";

/**
 * Runs unsubscribe() against a real Postgres database (see
 * vitest.integration.config.ts) instead of a mocked Prisma client. This is
 * what actually proves the cascading orphan-cleanup and the transaction
 * behave correctly under a real unique constraint — a mock can only tell you
 * the code called the methods you expected, not that the database agrees.
 *
 * Requires `pnpm test:db:up && pnpm test:db:migrate` first; run via
 * `pnpm test:integration`, not the default `pnpm test`.
 */

// Random ids per test so runs never collide, without needing a full DB reset
// between them.
async function createFixture() {
  const user = await prisma.user.create({
    data: {
      clerkUserId: `test-user-${randomUUID()}`,
      email: `${randomUUID()}@example.com`,
      name: "Integration Test User",
    },
  });

  const managedPlaylist = await prisma.managedPlaylist.create({
    data: {
      userId: user.clerkUserId,
      externalPlaylistId: `ext-managed-${randomUUID()}`,
      name: "Integration Test Managed Playlist",
      syncInterval: "WEEKLY",
    },
  });

  const sourcePlaylist = await prisma.sourcePlaylist.create({
    data: {
      externalPlaylistId: `ext-source-${randomUUID()}`,
      name: "Integration Test Source Playlist",
      trackCount: 10,
    },
  });

  const subscription = await prisma.managedPlaylistSourceSubscription.create({
    data: {
      managedPlaylistId: managedPlaylist.id,
      sourcePlaylistId: sourcePlaylist.id,
    },
  });

  return { user, managedPlaylist, sourcePlaylist, subscription };
}

// Tolerant of rows unsubscribe() already deleted itself — deleteMany on an
// id that doesn't exist just matches zero rows, it doesn't throw.
async function cleanupFixture(fixture: Awaited<ReturnType<typeof createFixture>>) {
  await prisma.managedPlaylistSourceSubscription.deleteMany({
    where: { id: fixture.subscription.id },
  });
  await prisma.sourcePlaylist.deleteMany({
    where: { id: fixture.sourcePlaylist.id },
  });
  await prisma.managedPlaylist.deleteMany({
    where: { id: fixture.managedPlaylist.id },
  });
  await prisma.user.delete({ where: { id: fixture.user.id } });
}

describe("unsubscribe (integration)", () => {
  let fixture: Awaited<ReturnType<typeof createFixture>> | null = null;

  afterEach(async () => {
    if (fixture) await cleanupFixture(fixture);
    fixture = null;
  });

  it("deletes the subscription and cleans up both orphaned rows for real", async () => {
    fixture = await createFixture();

    const result = await unsubscribe({
      userId: fixture.user.clerkUserId,
      managedPlaylistId: fixture.managedPlaylist.id,
      sourcePlaylistId: fixture.sourcePlaylist.id,
    });

    expect(result.managedPlaylistDeleted).toBe(true);

    const [subscriptionRow, sourceRow, managedRow] = await Promise.all([
      prisma.managedPlaylistSourceSubscription.findUnique({
        where: { id: fixture.subscription.id },
      }),
      prisma.sourcePlaylist.findUnique({ where: { id: fixture.sourcePlaylist.id } }),
      prisma.managedPlaylist.findUnique({ where: { id: fixture.managedPlaylist.id } }),
    ]);

    expect(subscriptionRow).toBeNull();
    expect(sourceRow).toBeNull();
    expect(managedRow).toBeNull();
  });

  it("leaves the subscription untouched when it doesn't belong to the caller", async () => {
    fixture = await createFixture();

    await expect(
      unsubscribe({
        userId: "someone-elses-clerk-id",
        managedPlaylistId: fixture.managedPlaylist.id,
        sourcePlaylistId: fixture.sourcePlaylist.id,
      }),
    ).rejects.toBeInstanceOf(UnsubscribeError);

    const subscriptionRow = await prisma.managedPlaylistSourceSubscription.findUnique({
      where: { id: fixture.subscription.id },
    });
    expect(subscriptionRow).not.toBeNull();
  });
});
