import prisma from "@/lib/prisma";
import { AuditLogger } from "@/lib/audit-logger";

export interface UnsubscribeParams {
  userId: string;
  managedPlaylistId: string;
  sourcePlaylistId: string;
}

export interface UnsubscribeResult {
  managedPlaylistId: string;
  playlistName: string;
  /** True if this was the last source — the managed playlist row (and its
   *  PlaylistFox tracking) was deleted along with it. The playlist itself
   *  isn't touched on the music service, it just stops being managed. */
  managedPlaylistDeleted: boolean;
}

/**
 * A failure the caller is expected to surface to the user, with a status hint
 * so each transport can express it in its own dialect — same role as
 * `SubscribeError` in lib/subscribe.ts.
 */
export class UnsubscribeError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "UnsubscribeError";
  }
}

/**
 * Unsubscribe a source playlist from a managed playlist, deleting either side
 * if it's left orphaned by the removal.
 *
 * Pure domain logic — no HTTP, no auth. `userId` is passed in so an HTTP route
 * (Clerk session) and a chat tool (already-resolved userId) can share this.
 */
export async function unsubscribe(
  params: UnsubscribeParams,
): Promise<UnsubscribeResult> {
  const { userId, managedPlaylistId, sourcePlaylistId } = params;

  return prisma.$transaction(async (tx) => {
    // Ownership check happens in the same query as the lookup: scoping to
    // `managedPlaylist: { userId }` means a subscription under someone else's
    // playlist simply doesn't match, rather than needing a separate check.
    const subscription = await tx.managedPlaylistSourceSubscription.findFirst({
      where: {
        sourcePlaylist: { id: sourcePlaylistId },
        managedPlaylist: { id: managedPlaylistId, userId },
      },
      select: {
        id: true,
        managedPlaylistId: true,
        sourcePlaylistId: true,
        managedPlaylist: { select: { id: true, name: true } },
      },
    });

    if (!subscription) {
      // Don't reveal whether the subscription doesn't exist or the user just
      // lacks permission on it.
      throw new UnsubscribeError(
        "Subscription not found or access denied",
        404,
      );
    }

    await tx.managedPlaylistSourceSubscription.delete({
      where: { id: subscription.id },
    });

    // A source or managed playlist with no remaining links is dead weight —
    // clean it up rather than leaving an orphaned row behind.
    const sourcePlaylistSubscriptionCount =
      await tx.managedPlaylistSourceSubscription.count({
        where: { sourcePlaylistId: subscription.sourcePlaylistId },
      });
    if (sourcePlaylistSubscriptionCount === 0) {
      await tx.sourcePlaylist.delete({
        where: { id: subscription.sourcePlaylistId },
      });
    }

    const managedPlaylistSubscriptionCount =
      await tx.managedPlaylistSourceSubscription.count({
        where: { managedPlaylistId: subscription.managedPlaylistId },
      });
    let managedPlaylistDeleted = false;
    if (managedPlaylistSubscriptionCount === 0) {
      await tx.managedPlaylist.delete({
        where: { id: subscription.managedPlaylistId },
      });
      managedPlaylistDeleted = true;
    }

    await AuditLogger.logSubscriptionDeleted(
      subscription.managedPlaylistId,
      subscription.sourcePlaylistId,
      userId,
    );

    return {
      managedPlaylistId: subscription.managedPlaylistId,
      playlistName: subscription.managedPlaylist.name,
      managedPlaylistDeleted,
    };
  });
}
