import { NextResponse } from "next/server";
import getClerkOAuthToken from "utils/clerk";
import prisma from "@/lib/prisma";
import { AuditLogger } from "@/lib/audit-logger";
import { addDays } from "date-fns";

export async function POST(request: Request) {
  const { userId, token } = await getClerkOAuthToken();

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
    sourcePlaylist, // Expecting { id: string, name: string, imageUrl?: string, trackCount: number }
  } = body;

  if (
    !managedPlaylist ||
    !managedPlaylist.id ||
    !managedPlaylist.name ||
    !managedPlaylist.trackCount ||
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

  const cleanedManagedSpotifyPlaylistId =
    managedPlaylist.id.split("/").pop()?.split("?")[0] || managedPlaylist.id;
  const cleanedSourceSpotifyPlaylistId =
    sourcePlaylist.id.split("/").pop()?.split("?")[0] || sourcePlaylist.id;

  // Validate cleaned IDs
  if (!cleanedManagedSpotifyPlaylistId || !cleanedSourceSpotifyPlaylistId) {
    return NextResponse.json(
      { error: "Invalid playlist IDs provided" },
      { status: 400 }
    );
  }

  try {
    // Use a transaction to ensure both playlist lookups/creations and the subscription are atomic
    const result = await prisma.$transaction(async (prisma) => {
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
            name: managedPlaylist.name,
            imageUrl: managedPlaylist.imageUrl || null,
            trackCount: managedPlaylist.trackCount || 0,
            lastMetadataRefreshAt: now,
          },
        });
      } else {
        // No managed playlist record exists for this Spotify ID, create it for the current user.
        finalManagedPlaylist = await prisma.managedPlaylist.create({
          data: {
            userId: userId, // Link to the current user
            spotifyPlaylistId: cleanedManagedSpotifyPlaylistId,
            name: managedPlaylist.name,
            imageUrl: managedPlaylist.imageUrl || null,
            // Default sync settings (syncIntervalMinutes, syncQuantityPerSource) are applied by Prisma
            // createdAt, updatedAt default
            lastSyncCompletedAt: null,
            nextSyncTime: addDays(new Date(), 7),
            syncInterval: "WEEKLY",
            lastMetadataRefreshAt: now,
            trackCount: managedPlaylist.trackCount || 0,
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

      // Return created/found data to the frontend
      return {
        managedPlaylist: finalManagedPlaylist,
        existingSourcePlaylist,
        subscription,
      };
    });

    // 7. Return Success Response
    console.log(
      `Subscription created: Managed Playlist ${result.managedPlaylist.id} subscribed to Source Playlist ${result.existingSourcePlaylist.id} for user ${userId}. Subscription ID: ${result.subscription.id}`
    );
    return NextResponse.json(
      {
        message: "Subscription created successfully",
        subscriptionId: result.subscription.id,
        managedPlaylist: {
          // Return basic info about the involved playlists if helpful for frontend
          id: result.managedPlaylist.id,
          spotifyId: result.managedPlaylist.spotifyPlaylistId,
          name: result.managedPlaylist.name,
        },
        sourcePlaylist: {
          id: result.existingSourcePlaylist.id,
          spotifyId: result.existingSourcePlaylist.spotifyPlaylistId,
          name: result.existingSourcePlaylist.name,
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
