import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import getClerkOAuthToken from "utils/clerk";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) return new Response("Unauthorized", { status: 401 });

  try {
    const subscriptions =
      await prisma.managedPlaylistSourceSubscription.findMany({
        where: {
          managedPlaylist: {
            userId,
          },
        },
        include: {
          managedPlaylist: true,
          sourcePlaylist: true,
        },
      });

    // Group by destination playlist
    const grouped = new Map();

    subscriptions.forEach((s) => {
      const destId = s.managedPlaylist.id;

      if (!grouped.has(destId)) {
        grouped.set(destId, {
          destination: {
            id: s.managedPlaylist.id,
            name: s.managedPlaylist.name,
            imageUrl: s.managedPlaylist.imageUrl,
            spotifyId: s.managedPlaylist.spotifyPlaylistId,
            syncInterval: s.managedPlaylist.syncInterval,
            syncQuantityPerSource: s.managedPlaylist.syncQuantityPerSource,
          },
          sources: [],
        });
      }

      grouped.get(destId).sources.push({
        id: s.sourcePlaylist.id,
        name: s.sourcePlaylist.name,
        imageUrl: s.sourcePlaylist.imageUrl,
        spotifyId: s.sourcePlaylist.spotifyPlaylistId,
      });
    });

    return NextResponse.json(Array.from(grouped.values()));
  } catch (error) {
    return Response.json(error);
  }
}
