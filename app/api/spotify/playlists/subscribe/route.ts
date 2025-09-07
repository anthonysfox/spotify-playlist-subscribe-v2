import { NextResponse } from "next/server";
import getClerkOAuthToken from "utils/clerk";
import prisma from "@/lib/prisma";
import { AuditLogger } from "@/lib/audit-logger";
import {
  addDays,
  addHours,
  addMinutes,
  setHours,
  setMinutes,
  nextMonday,
  nextSunday,
} from "date-fns";

export async function POST(request: Request) {
  const { userId, token, spotifyUserId } = await getClerkOAuthToken();

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
    syncFrequency = "WEEKLY",
    runImmediateSync = true,
    syncMode = "APPEND",
    explicitContentFilter = false,
    trackAgeLimit = 0,
    customDays,
    customTime,
  } = body;

  if (
    (!newPlaylistName && !managedPlaylist) ||
    (managedPlaylist &&
      (!managedPlaylist.id ||
        !managedPlaylist.name ||
        !managedPlaylist.trackCount)) ||
    !sourcePlaylist ||
    !sourcePlaylist.id ||
    !sourcePlaylist.name ||
    !sourcePlaylist.trackCount
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
    ? await createSpotifyPlaylist(newPlaylistName, spotifyUserId, token)
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
    // Use a transaction to ensure both playlist lookups/creations and the subscription are atomic
    const result = await prisma.$transaction(
      async (prisma) => {
        // 4. Find or Create Managed (Destination) Playlist for THIS USER
        // We need to find a managed playlist record with this Spotify ID *owned by this user*.
        // If not found, create it.

        const existingManagedPlaylist = await prisma.managedPlaylist.findFirst({
          where: {
            spotifyPlaylistId: cleanedManagedSpotifyPlaylistId,
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

          const nextSyncTime = calculateNextSyncTime(
            syncFrequency,
            customDays,
            customTime
          );

          finalManagedPlaylist = await prisma.managedPlaylist.create({
            data: {
              userId: userId, // Link to the current user
              spotifyPlaylistId: cleanedManagedSpotifyPlaylistId,
              name: managedPlaylistToUse.name,
              imageUrl: managedPlaylistToUse.imageUrl || null,
              // Default sync settings (syncIntervalMinutes, syncQuantityPerSource) are applied by Prisma
              // createdAt, updatedAt default
              lastSyncCompletedAt: null,
              nextSyncTime,
              syncInterval: syncFrequency as any,
              syncQuantityPerSource: 5,
              syncMode: syncMode as any,
              explicitContentFilter,
              trackAgeLimit,
              customDays: customDays ? JSON.stringify(customDays) : null,
              customTime: customTime || null,
              lastMetadataRefreshAt: now,
              trackCount: managedPlaylistToUse.trackCount || 0,
            },
          });
        }

        // 5. Find or Create Source Playlist (scoped globally by Spotify ID)
        // First try to find an existing non-deleted source playlist
        let existingSourcePlaylist = await prisma.sourcePlaylist.findFirst({
          where: {
            spotifyPlaylistId: cleanedSourceSpotifyPlaylistId,
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
              spotifyPlaylistId: cleanedSourceSpotifyPlaylistId,
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
            method: "POST",
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

async function createSpotifyPlaylist(
  playlistName: string,
  spotifyUserId: string,
  token: string
) {
  const spotifyCreatePlaylistAPI: string = `https://api.spotify.com/v1/users/${spotifyUserId}/playlists`;

  const spotifyPlaylistCreateResp = await fetch(spotifyCreatePlaylistAPI, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: playlistName,
      public: false,
    }),
  });

  if (!spotifyPlaylistCreateResp.ok) {
    throw new Error(
      `Failed to create spotify playlist: ${spotifyPlaylistCreateResp.statusText}`
    );
  }

  const {
    id,
    name,
    tracks: { count },
    images,
  } = await spotifyPlaylistCreateResp.json();

  return {
    id,
    name,
    trackCount: count,
    imageUrl: images?.[0]?.url || "",
  };
}

function calculateNextSyncTime(
  syncFrequency: string,
  customDays: string[],
  customTime: string
) {
  const now = new Date();

  switch (syncFrequency) {
    case "DAILY":
      return addDays(now, 1);
    case "WEEKLY":
      return addDays(now, 7);
    case "MONTHLY":
      return addDays(now, 30);
    case "CUSTOM":
      return calculateNextCustomRun(customDays, customTime);
    default:
      return addDays(now, 7);
  }
}

function calculateNextCustomRun(days?: string[], time?: string) {
  if (!days || !time) return null;

  const [hours, minutes] = time.split(":").map(Number);
  const now = new Date();

  const dayMap: { [key: string]: number } = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const targetDays = days
    .map((day) => dayMap[day.toLowerCase()])
    .filter((day) => day !== undefined);

  if (!targetDays.length) return null;

  for (let i = 0; i < 7; i++) {
    const candidateDate = addDays(now, i);
    const dayOfWeek = candidateDate.getDay();

    if (targetDays.includes(dayOfWeek)) {
      let scheduledTime = setHours(setMinutes(candidateDate, minutes), hours);

      if (i == 0 && scheduledTime <= now) {
        continue;
      }

      return scheduledTime;
    }
  }

  const firstTargetDay = Math.min(...targetDays);
  const daysUntilTarget = (firstTargetDay + 7 - now.getDay()) % 7 || 7;
  return setHours(setMinutes(now, daysUntilTarget), hours);
}
