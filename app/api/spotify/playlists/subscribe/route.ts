import { NextResponse } from "next/server";
import getClerkOAuthToken from "utils/clerk";
import prisma from "@/lib/prisma";
import { AuditLogger } from "@/lib/audit-logger";

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
    destinationPlaylist, // Expecting { id: string, name: string, imageUrl?: string }
    sourcePlaylist, // Expecting { id: string, name: string, imageUrl?: string }
  } = body;

  if (
    !destinationPlaylist ||
    !destinationPlaylist.id ||
    !destinationPlaylist.name ||
    !sourcePlaylist ||
    !sourcePlaylist.id ||
    !sourcePlaylist.name
  ) {
    return NextResponse.json(
      {
        error:
          "Missing required playlist information (id or name for both destination and source)",
      },
      { status: 400 }
    );
  }

  const cleanedDestinationSpotifyPlaylistId =
    destinationPlaylist.id.split("/").pop()?.split("?")[0] ||
    destinationPlaylist.id;
  const cleanedSourceSpotifyPlaylistId =
    sourcePlaylist.id.split("/").pop()?.split("?")[0] || sourcePlaylist.id;

  try {
    // Use a transaction to ensure both playlist lookups/creations and the subscription are atomic
    const result = await prisma.$transaction(async (prisma) => {
      // 4. Find or Create Managed (Destination) Playlist for THIS USER
      // We need to find a managed playlist record with this Spotify ID *owned by this user*.
      // If not found, create it.
      const existingManagedPlaylist = await prisma.managedPlaylist.findFirst({
        where: { spotifyPlaylistId: cleanedDestinationSpotifyPlaylistId },
      });

      let finalManagedPlaylist;

      if (existingManagedPlaylist) {
        // If a record exists for this Spotify ID, verify it belongs to the current user
        if (existingManagedPlaylist.userId !== userId) {
          // This Spotify playlist ID is already registered as a managed playlist for a DIFFERENT user.
          // This indicates a potential issue or a policy decision needed (can a playlist be managed by multiple app users?).
          // For this example, we'll throw an error assuming a managed playlist is unique to one app user.
          throw new Error(
            "This destination playlist is already being managed by another user."
          );
        }
        // If owned by the user, use the existing managed playlist record.
        // Optionally update name/image in case it changed on Spotify or frontend sent updated info.
        finalManagedPlaylist = await prisma.managedPlaylist.update({
          where: { id: existingManagedPlaylist.id },
          data: {
            name: destinationPlaylist.name,
            imageUrl: destinationPlaylist.imageUrl || null,
          },
        });
      } else {
        // No managed playlist record exists for this Spotify ID, create it for the current user.
        finalManagedPlaylist = await prisma.managedPlaylist.create({
          data: {
            userId: userId, // Link to the current user
            spotifyPlaylistId: cleanedDestinationSpotifyPlaylistId,
            name: destinationPlaylist.name,
            imageUrl: destinationPlaylist.imageUrl || null,
            // Default sync settings (syncIntervalMinutes, syncQuantityPerSource) are applied by Prisma
            // createdAt, updatedAt default
            lastSyncCompletedAt: null,
            nextSyncTime: null,
            syncInterval: "WEEKLY",
          },
        });
      }

      // 5. Find or Create Source Playlist (scoped globally by Spotify ID)
      // We find a source playlist record with this Spotify ID. If not found, create it.
      const existingSourcePlaylist = await prisma.sourcePlaylist.upsert({
        where: { spotifyPlaylistId: cleanedSourceSpotifyPlaylistId },
        update: {
          // Optionally update name/image in case it changed on Spotify or frontend sent updated info
          name: sourcePlaylist.name,
          imageUrl: sourcePlaylist.imageUrl || null,
        },
        create: {
          spotifyPlaylistId: cleanedSourceSpotifyPlaylistId,
          name: sourcePlaylist.name,
          imageUrl: sourcePlaylist.imageUrl || null,
          // createdAt, updatedAt default
        },
      });

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

// export async function DELETE(request: Request) {
//   const { userId } = auth();

//   if (!userId) return new Response("Unauthorized", { status: 401 });

//   try {
//     const data = await request.json();

//     const subscription = await prisma.subscription.deleteMany({});

//     return NextResponse.json({ subscription });
//   } catch (error) {
//     return Response.json(error);
//   }
// }
