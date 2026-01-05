import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import getClerkOAuthToken from "utils/clerk";
import prisma from "@/lib/prisma";
import { getAppUrl } from "utils/config";

// const staleThresholds = {
//   managedPlaylist: 30 * 60 * 1000, // 30 minutes
//   sourcePlaylist: 24 * 60 * 60 * 1000, // 24 hours
// };

const staleThresholds = {
  managedPlaylist: 10 * 1000, // 10 seconds
  sourcePlaylist: 20 * 1000, // 20 seconds
};

export async function GET(request: Request) {
  const { userId, token } = await getClerkOAuthToken();

  if (!userId) return new Response("Unauthorized", { status: 401 });

  try {
    const subscriptions = await prisma.managedPlaylist.findMany({
      where: { userId },
      include: {
        subscriptions: {
          where: {
            sourcePlaylist: {
              deletedAt: null,
            },
          },
          include: {
            sourcePlaylist: true,
          },
        },
      },
    });

    const now = new Date();
    const playlistsToUpdate = new Map();
    const seenSourcePlaylists = new Set();

    // Single loop to collect all playlists needing updates
    subscriptions.forEach((managedPlaylist) => {
      if (
        now.getTime() - managedPlaylist.lastMetadataRefreshAt.getTime() >
        staleThresholds.managedPlaylist
      ) {
        playlistsToUpdate.set(managedPlaylist.spotifyPlaylistId, {
          type: "managed",
          id: managedPlaylist.id,
          playlist: managedPlaylist,
          spotifyId: managedPlaylist.spotifyPlaylistId,
        });
      }

      // Check source playlists (with deduplication)
      managedPlaylist.subscriptions.forEach((subsription) => {
        const source = subsription.sourcePlaylist;

        if (
          !seenSourcePlaylists.has(source.spotifyPlaylistId) &&
          now.getTime() - source.lastMetadataRefreshAt.getTime() >
            staleThresholds.sourcePlaylist
        ) {
          seenSourcePlaylists.add(source.spotifyPlaylistId);
          playlistsToUpdate.set(source.spotifyPlaylistId, {
            type: "source",
            id: source.id,
            playlist: source,
            spotifyId: source.spotifyPlaylistId,
          });
        }
      });
    });

    if (playlistsToUpdate.size) {
      await Promise.all(
        Array.from(playlistsToUpdate.values()).map(
          async ({ spotifyId, playlist, id, type }) => {
            try {
              const response = await fetch(
                `https://api.spotify.com/v1/playlists/${spotifyId}?fields=tracks.total`,
                { headers: { Authorization: `Bearer ${token}` } }
              );

              if (response.ok) {
                const data = await response.json();

                const updateData = {
                  trackCount: data.tracks.total,
                  lastMetadataRefreshAt: new Date(),
                };

                if (type === "managed") {
                  await prisma.managedPlaylist.update({
                    where: { id },
                    data: updateData,
                  });
                } else {
                  await prisma.sourcePlaylist.update({
                    where: { id },
                    data: updateData,
                  });
                }

                playlist.trackCount = data.tracks.total;
                playlist.lastMetadataRefreshAt = new Date();
              }
            } catch (error) {
              console.error(
                `Failed to update ${playlist.type} playlist ${playlist.id}:`,
                error
              );
            }
          }
        )
      );
    }

    return NextResponse.json(subscriptions);
  } catch (error) {
    return Response.json(error);
  }
}
