import prisma from "@/lib/prisma";
import { AuditLogger } from "@/lib/audit-logger";
import { calculateNextSyncTime } from "utils/sync-schedule";
import { getProvider, type MusicProvider } from "@/lib/music";
import type { ManagedPlaylistWithSubscriptions } from "@/types";

/**
 * The minimal playlist shape the subscribe flow needs from a caller — an id, a
 * name, and a track count (imageUrl optional). Both the destination and the
 * source arrive in this form.
 *
 * Note this is *objects*, not ids: the service has to write name/imageUrl/
 * trackCount into the DB rows, so it needs the metadata. A caller that only has
 * ids (e.g. an MCP tool) resolves them to this shape first — that resolution is
 * the transport's job, not the service's.
 */
export interface PlaylistRef {
  id: string;
  name: string;
  imageUrl?: string | null;
  trackCount: number;
}

/**
 * Everything `subscribe()` needs, independent of how the request arrived.
 *
 * `userId` is passed in rather than resolved here on purpose: that's what lets an
 * HTTP route (Clerk session) and an MCP tool (bearer token) share this function —
 * each authenticates in its own way, then hands the resolved user in.
 */
export interface SubscribeParams {
  userId: string;
  /** Which service both playlists live on. Defaults to Spotify. */
  provider?: MusicProvider;
  sourcePlaylist: PlaylistRef;
  managedPlaylist?: PlaylistRef;
  newPlaylistName?: string;
  syncFrequency?: string;
  syncQuantityPerSource?: number;
  runImmediateSync?: boolean;
  syncMode?: string;
  explicitContentFilter?: boolean;
  trackAgeLimit?: number;
  vibePrompt?: string;
  customDays?: string[];
}

export interface SubscribeResult {
  managedPlaylist: ManagedPlaylistWithSubscriptions | null;
  subscriptionId: string;
}

/**
 * A failure the caller is expected to surface to the user, with a status hint so
 * each transport can express it in its own dialect (HTTP status code, MCP
 * `isError`, …). Anything that isn't a `SubscribeError` is an unexpected fault
 * and should map to a generic 500 / "something went wrong".
 */
export class SubscribeError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "SubscribeError";
  }
}

/**
 * Subscribe a source playlist to a managed (destination) playlist, creating the
 * destination on the music service first if `newPlaylistName` is given.
 *
 * Pure domain logic: it knows nothing about HTTP or MCP. It returns plain data
 * and throws `SubscribeError` for anything the user should see.
 */
export async function subscribe(
  params: SubscribeParams,
): Promise<SubscribeResult> {
  const {
    userId,
    provider = "SPOTIFY" as MusicProvider,
    sourcePlaylist,
    managedPlaylist,
    newPlaylistName,
    syncFrequency = "WEEKLY",
    syncQuantityPerSource = 5,
    runImmediateSync = true,
    syncMode = "APPEND",
    explicitContentFilter = false,
    trackAgeLimit = 0,
    vibePrompt,
    customDays,
  } = params;

  // Creating a playlist is the only thing here that touches a music service, and
  // it goes through the provider abstraction rather than Spotify's API directly
  // — which is what lets an Apple Music playlist be created at all.
  const client = await getProvider(provider).forUser(userId);
  if (!client) {
    throw new SubscribeError(`${provider} is not connected for this user`, 400);
  }

  // REPLACE needs to empty the playlist on each sync, and Apple Music's API
  // cannot remove tracks. Refuse it up front rather than creating a playlist that
  // the sync engine would then permanently skip. (A domain rule, so it lives here
  // — every caller, HTTP or MCP, is held to it.)
  if (syncMode === "REPLACE" && !client.capabilities.removeTracks) {
    throw new SubscribeError(
      `${provider} cannot remove tracks from a playlist, so "replace" mode isn't available. Use "add new songs" instead.`,
      400,
    );
  }

  if (
    (!newPlaylistName && !managedPlaylist) ||
    (managedPlaylist &&
      (!managedPlaylist.id ||
        !managedPlaylist.name ||
        managedPlaylist.trackCount === undefined)) ||
    !sourcePlaylist ||
    !sourcePlaylist.id ||
    !sourcePlaylist.name ||
    // `=== undefined`, not `!trackCount`: a count of 0 is valid and common —
    // Apple Music's catalogue search doesn't report track counts at all, so an
    // Apple source legitimately arrives with trackCount: 0.
    sourcePlaylist.trackCount === undefined
  ) {
    throw new SubscribeError(
      "Missing required playlist information (id or name for both destination and source)",
      400,
    );
  }

  const managedPlaylistToUse: PlaylistRef = newPlaylistName
    ? await client.createPlaylist(newPlaylistName, randomFoxDescription())
    : { ...(managedPlaylist as PlaylistRef) };

  const cleanedManagedSpotifyPlaylistId =
    managedPlaylistToUse?.id.split("/").pop()?.split("?")[0] ||
    managedPlaylistToUse?.id ||
    "";
  const cleanedSourceSpotifyPlaylistId =
    sourcePlaylist?.id.split("/").pop()?.split("?")[0] ||
    sourcePlaylist?.id ||
    "";

  if (
    (!cleanedManagedSpotifyPlaylistId || !cleanedSourceSpotifyPlaylistId) &&
    !newPlaylistName
  ) {
    throw new SubscribeError("Invalid playlist IDs provided", 400);
  }

  try {
    // Ensure the user row exists before creating a managed playlist (fallback for
    // webhook timing issues).
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      const clerkClient = (await import("@clerk/nextjs/server")).clerkClient;
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId);

      await prisma.user.create({
        data: {
          clerkUserId: userId,
          email: clerkUser.emailAddresses?.[0]?.emailAddress || "",
          name:
            `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
            "User",
          imageUrl: clerkUser.imageUrl,
        },
      });
    }

    // A transaction so the playlist lookups/creations and the subscription link
    // are atomic.
    const result = await prisma.$transaction(
      async (tx) => {
        const existingManagedPlaylist = await tx.managedPlaylist.findFirst({
          where: {
            externalPlaylistId: cleanedManagedSpotifyPlaylistId,
            provider,
            userId,
          },
        });
        const now = new Date();

        let finalManagedPlaylist;

        if (existingManagedPlaylist) {
          // Owned by the user already — reuse it, refreshing name/image in case
          // they changed on the service or the caller sent newer info.
          finalManagedPlaylist = await tx.managedPlaylist.update({
            where: { id: existingManagedPlaylist.id },
            data: {
              name: managedPlaylistToUse.name,
              imageUrl: managedPlaylistToUse.imageUrl || null,
              trackCount: managedPlaylistToUse.trackCount || 0,
              lastMetadataRefreshAt: now,
            },
          });
        } else {
          const nextSyncTime = calculateNextSyncTime(syncFrequency, {
            timeZone: user?.timezone,
            customDays,
          });

          finalManagedPlaylist = await tx.managedPlaylist.create({
            data: {
              userId,
              externalPlaylistId: cleanedManagedSpotifyPlaylistId,
              provider,
              name: managedPlaylistToUse.name,
              imageUrl: managedPlaylistToUse.imageUrl || null,
              lastSyncCompletedAt: null,
              nextSyncTime,
              syncInterval: syncFrequency as any,
              syncQuantityPerSource,
              syncMode: syncMode as any,
              explicitContentFilter,
              trackAgeLimit,
              // Empty string is not a vibe — store null so the sync engine skips
              // the model entirely for playlists that never set one.
              vibePrompt: vibePrompt?.trim() ? vibePrompt.trim() : null,
              customDays: customDays ? JSON.stringify(customDays) : null,
              lastMetadataRefreshAt: now,
              trackCount: managedPlaylistToUse.trackCount || 0,
            },
          });
        }

        // Find or create the source playlist (scoped globally by provider id).
        let existingSourcePlaylist = await tx.sourcePlaylist.findFirst({
          where: {
            externalPlaylistId: cleanedSourceSpotifyPlaylistId,
            provider,
          },
        });

        if (existingSourcePlaylist) {
          existingSourcePlaylist = await tx.sourcePlaylist.update({
            where: { id: existingSourcePlaylist.id },
            data: {
              name: sourcePlaylist.name,
              imageUrl: sourcePlaylist.imageUrl || null,
              lastMetadataRefreshAt: now,
              trackCount: sourcePlaylist.trackCount,
              deletedAt: null,
            },
          });
        } else {
          existingSourcePlaylist = await tx.sourcePlaylist.create({
            data: {
              externalPlaylistId: cleanedSourceSpotifyPlaylistId,
              provider,
              name: sourcePlaylist.name,
              imageUrl: sourcePlaylist.imageUrl || null,
              lastMetadataRefreshAt: now,
              trackCount: sourcePlaylist.trackCount || 0,
            },
          });
        }

        // Create the link. The @@unique constraint prevents duplicates.
        const subscription = await tx.managedPlaylistSourceSubscription.create({
          data: {
            managedPlaylistId: finalManagedPlaylist.id,
            sourcePlaylistId: existingSourcePlaylist.id,
            lastSyncedFromSourceAt: null,
          },
        });

        await AuditLogger.logSubscriptionCreated(
          finalManagedPlaylist.id,
          existingSourcePlaylist.id,
          userId,
        );

        if (runImmediateSync) {
          const syncUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/cron/sync?playlistId=${finalManagedPlaylist.id}&sourceId=${existingSourcePlaylist.id}&force=true`;

          // Fire-and-forget: a failed sync shouldn't fail the subscription.
          fetch(syncUrl, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${process.env.CRON_SECRET}`,
              "Content-Type": "application/json",
            },
          }).catch((error) => {
            console.error("Failed to trigger immediate sync:", error);
          });
        }

        return { finalManagedPlaylist, existingSourcePlaylist, subscription };
      },
      { timeout: 10000 },
    );

    const completePlaylist = await prisma.managedPlaylist.findUnique({
      where: { id: result.finalManagedPlaylist.id },
      include: {
        subscriptions: {
          include: { sourcePlaylist: true },
        },
      },
    });

    return {
      managedPlaylist: completePlaylist,
      subscriptionId: result.subscription.id,
    };
  } catch (error: any) {
    // Translate failures that have a specific meaning into SubscribeErrors so
    // every transport maps them consistently. Everything else bubbles up as an
    // unexpected fault for the caller to treat as a 500.
    if (error instanceof SubscribeError) throw error;

    if (error?.code === "P2002") {
      // Unique constraint on [managedPlaylistId, sourcePlaylistId].
      throw new SubscribeError(
        "Already subscribed to this source playlist with this destination playlist.",
        409,
      );
    }

    if (
      typeof error?.message === "string" &&
      error.message.includes(
        "This destination playlist is already being managed by another user.",
      )
    ) {
      throw new SubscribeError(error.message, 403);
    }

    throw error;
  }
}

/**
 * The playlist description PlaylistFox stamps on playlists it creates.
 */
function randomFoxDescription(): string {
  const descriptions = [
    "🦊 Auto-updated by PlaylistFox from your favorite playlists",
    "🦊 Fresh tracks delivered by PlaylistFox",
    "🦊 Your personal mixtape, courtesy of PlaylistFox",
    "🦊 PlaylistFox keeps this playlist fresh for you",
    "🦊 Curated and updated by PlaylistFox",
    "🦊 Your soundtrack, supercharged by PlaylistFox",
    "🦊 PlaylistFox is hunting down your next favorite song",
    "🦊 Automatically foxed up with fresh music",
    "🦊 Your music, cleverly curated by PlaylistFox",
    "🦊 PlaylistFox: making your playlists smarter, not harder",
    "🦊 Sly beats, served fresh by PlaylistFox",
    "🦊 PlaylistFox prowls for your perfect tracks",
  ];

  return descriptions[Math.floor(Math.random() * descriptions.length)];
}
