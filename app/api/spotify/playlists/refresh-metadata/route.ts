import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import getClerkOAuthToken from "utils/clerk";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { playlistIds } = await request.json();
    
    if (!playlistIds || !Array.isArray(playlistIds)) {
      return NextResponse.json(
        { error: "playlistIds array is required" },
        { status: 400 }
      );
    }

    const { token } = await getClerkOAuthToken(userId);
    if (!token) {
      return NextResponse.json(
        { error: "No valid Spotify token" },
        { status: 401 }
      );
    }

    const updatePromises = playlistIds.map(async (playlistId: string) => {
      try {
        // Get managed playlist
        const managedPlaylist = await prisma.managedPlaylist.findFirst({
          where: {
            id: playlistId,
            userId,
          },
        });

        if (!managedPlaylist) {
          console.warn(`Playlist ${playlistId} not found for user ${userId}`);
          return null;
        }

        // Fetch latest metadata from Spotify
        const spotifyResponse = await fetch(
          `${process.env.BASE_SPOTIFY_URL}/playlists/${managedPlaylist.spotifyPlaylistId}?fields=name,images,tracks.total`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!spotifyResponse.ok) {
          console.warn(`Failed to fetch metadata for playlist ${playlistId}`);
          return null;
        }

        const spotifyData = await spotifyResponse.json();

        // Update database with fresh metadata
        const updatedPlaylist = await prisma.managedPlaylist.update({
          where: { id: playlistId },
          data: {
            name: spotifyData.name,
            imageUrl: spotifyData.images?.[0]?.url || managedPlaylist.imageUrl,
            trackCount: spotifyData.tracks?.total || managedPlaylist.trackCount,
            lastMetadataRefreshAt: new Date(),
          },
        });

        return updatedPlaylist;
      } catch (error) {
        console.error(`Error refreshing metadata for playlist ${playlistId}:`, error);
        return null;
      }
    });

    const results = await Promise.all(updatePromises);
    const successfulUpdates = results.filter(Boolean);

    return NextResponse.json({
      success: true,
      message: `Refreshed metadata for ${successfulUpdates.length}/${playlistIds.length} playlists`,
      updatedPlaylists: successfulUpdates,
    });

  } catch (error: any) {
    console.error("Error refreshing playlist metadata:", error);
    return NextResponse.json(
      { error: "Failed to refresh metadata", details: error.message },
      { status: 500 }
    );
  }
}