import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { AuditLogger } from "@/lib/audit-logger";
import { calculateNextSyncTime } from "utils/sync-schedule";
import { getProvider, type MusicProvider } from "@/lib/music";

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    managedPlaylist, // Expecting { id: string, name: string, imageUrl?: string, trackCount: number }
    sourcePlaylist, // Expecting { id: string, name: string, imageUrl?: string, trackCount: number },
    newPlaylistName,
    // Which service both playlists live on. Defaults to Spotify so every
    // existing caller keeps working unchanged.
    provider = "SPOTIFY" as MusicProvider,
    syncFrequency = "WEEKLY",
    syncQuantityPerSource = 5,
    runImmediateSync = true,
    syncMode = "APPEND",
    explicitContentFilter = false,
    trackAgeLimit = 0,
    vibePrompt,
    customDays,
  } = body;

  // Creating a playlist is the only thing here that touches a music service, and
  // it now goes through the provider abstraction rather than Spotify's API
  // directly — which is what lets an Apple Music playlist be created at all.
  const client = await getProvider(provider).forUser(userId);

  if (!client) {
    return NextResponse.json(
      { error: `${provider} is not connected for this user` },
      { status: 400 },
    );
  }

  // REPLACE needs to empty the playlist on each sync, and Apple Music's API
  // cannot remove tracks. Refuse it up front rather than creating a playlist that
  // the sync engine would then permanently skip.
  if (syncMode === "REPLACE" && !client.capabilities.removeTracks) {
    return NextResponse.json(
      {
        error: `${provider} cannot remove tracks from a playlist, so "replace" mode isn't available. Use "add new songs" instead.`,
      },
      { status: 400 },
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
    // Apple source legitimately arrives with trackCount: 0. Rejecting falsy was
    // blocking every Apple subscription.
    sourcePlaylist.trackCount === undefined
  ) {
    return NextResponse.json(
      {
        error:
          "Missing required playlist information (id or name for both destination and source)",
      },
      { status: 400 }
    );
  }

  let managedPlaylistToUse = newPlaylistName
    ? await client.createPlaylist(newPlaylistName, randomFoxDescription())
    : { ...managedPlaylist };

  const cleanedManagedSpotifyPlaylistId =
    managedPlaylistToUse?.id.split("/").pop()?.split("?")[0] ||
    managedPlaylistToUse?.id ||
    "";
  const cleanedSourceSpotifyPlaylistId =
    sourcePlaylist?.id.split("/").pop()?.split("?")[0] ||
    sourcePlaylist?.id ||
    "";

  // Validate cleaned IDs
  if (
    (!cleanedManagedSpotifyPlaylistId || !cleanedSourceSpotifyPlaylistId) &&
    !newPlaylistName
  ) {
    return NextResponse.json(
      { error: "Invalid playlist IDs provided" },
      { status: 400 }
    );
  }

  try {
    // Ensure user exists in database before creating managed playlist
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      // Create user if not exists (fallback for webhook timing issues).
      // This used to call getClerkOAuthToken() purely to re-derive a userId we
      // already have from auth() — which also made it implicitly require a
      // Spotify grant to create a user at all.
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

    // Use a transaction to ensure both playlist lookups/creations and the subscription are atomic
    const result = await prisma.$transaction(
      async (prisma) => {
        // 4. Find or Create Managed (Destination) Playlist for THIS USER
        // We need to find a managed playlist record with this Spotify ID *owned by this user*.
        // If not found, create it.

        const existingManagedPlaylist = await prisma.managedPlaylist.findFirst({
          where: {
            externalPlaylistId: cleanedManagedSpotifyPlaylistId,
            provider,
            userId,
          },
        });
        const now = new Date();

        let finalManagedPlaylist;

        if (existingManagedPlaylist) {
          // If owned by the user, use the existing managed playlist record.
          // Optionally update name/image in case it changed on Spotify or frontend sent updated info.
          finalManagedPlaylist = await prisma.managedPlaylist.update({
            where: { id: existingManagedPlaylist.id },
            data: {
              name: managedPlaylistToUse.name,
              imageUrl: managedPlaylistToUse.imageUrl || null,
              trackCount: managedPlaylistToUse.trackCount || 0,
              lastMetadataRefreshAt: now,
            },
          });
        } else {
          // No managed playlist record exists for this Spotify ID, create it for the current user.

          const nextSyncTime = calculateNextSyncTime(syncFrequency, {
            timeZone: user?.timezone,
            customDays,
          });

          finalManagedPlaylist = await prisma.managedPlaylist.create({
            data: {
              userId: userId, // Link to the current user
              externalPlaylistId: cleanedManagedSpotifyPlaylistId,
              provider,
              name: managedPlaylistToUse.name,
              imageUrl: managedPlaylistToUse.imageUrl || null,
              // Default sync settings (syncIntervalMinutes, syncQuantityPerSource) are applied by Prisma
              // createdAt, updatedAt default
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

        // 5. Find or Create Source Playlist (scoped globally by Spotify ID)
        // First try to find an existing non-deleted source playlist
        let existingSourcePlaylist = await prisma.sourcePlaylist.findFirst({
          where: {
            externalPlaylistId: cleanedSourceSpotifyPlaylistId,
            provider,
          },
        });

        if (existingSourcePlaylist) {
          // Update existing source playlist
          existingSourcePlaylist = await prisma.sourcePlaylist.update({
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
          // Create new source playlist
          existingSourcePlaylist = await prisma.sourcePlaylist.create({
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

        // 6. Check for Existing Subscription & Create New Subscription
        // This attempts to create the link. Prisma's @@unique constraint will prevent duplicates.
        const subscription =
          await prisma.managedPlaylistSourceSubscription.create({
            data: {
              managedPlaylistId: finalManagedPlaylist.id, // Use the internal ID of the destination playlist
              sourcePlaylistId: existingSourcePlaylist.id, // Use the internal ID of the source playlist
              lastSyncedFromSourceAt: null, // Initially null for a new subscription link
              // createdAt default
            },
          });

        await AuditLogger.logSubscriptionCreated(
          finalManagedPlaylist.id,
          existingSourcePlaylist.id,
          userId
        );

        if (runImmediateSync) {
          const syncUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/cron/sync?playlistId=${finalManagedPlaylist.id}&sourceId=${existingSourcePlaylist.id}&force=true`;

          fetch(syncUrl, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${process.env.CRON_SECRET}`,
              "Content-Type": "application/json",
            },
          }).catch((error) => {
            console.error("Failed to trigger immediate sync:", error);
          });

          console.log(
            `✅ Immediate sync triggered for playlist ${finalManagedPlaylist.id}`
          );

          // Don't fail the subscription if sync fails
        }

        // Return created/found data to the frontend
        return {
          managedPlaylist: finalManagedPlaylist,
          existingSourcePlaylist,
          subscription,
        };
      },
      { timeout: 10000 }
    );

    // 7. get the managed playlist with subscriptions
    const completePlaylist = await prisma.managedPlaylist.findUnique({
      where: {
        id: result.managedPlaylist.id,
      },
      include: {
        subscriptions: {
          include: {
            sourcePlaylist: true,
          },
        },
      },
    });

    console.log(
      `Subscription created: Managed Playlist ${result.managedPlaylist.id} subscribed to Source Playlist ${result.existingSourcePlaylist.id} for user ${userId}. Subscription ID: ${result.subscription.id}`
    );
    return NextResponse.json(
      {
        message: "Subscription created successfully",
        success: true,
        data: {
          managedPlaylist: completePlaylist,
          subscriptionId: result.subscription.id,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error handling subscribe request:", error);

    // 8. Handle Specific Errors
    if (error.code === "P2002") {
      // Prisma unique constraint violation code
      // Happens if the unique index on [managedPlaylistId, sourcePlaylistId] is violated
      return NextResponse.json(
        {
          error:
            "Already subscribed to this source playlist with this destination playlist.",
        },
        { status: 409 }
      );
    }
    // Handle custom errors thrown during the transaction
    if (
      error.message.includes(
        "This destination playlist is already being managed by another user."
      )
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 }); // Forbidden
    }

    // 9. Handle Other Errors
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}


/**
 * The playlist description PlaylistFox stamps on playlists it creates.
 *
 * This used to live inside a Spotify-specific createSpotifyPlaylist() helper. The
 * playlist creation itself now goes through MusicClient, so only the copy is
 * left here — and it applies to Apple Music playlists just as well.
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
