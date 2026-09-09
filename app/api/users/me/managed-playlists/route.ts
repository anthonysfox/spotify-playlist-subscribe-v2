import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import getClerkOAuthToken from "utils/clerk";
import prisma from "@/lib/prisma";
import { getAppUrl } from "utils/config";
import {
  CONTRIBUTION_WINDOW_MS,
  toSyncRunSummary,
  type SourceContribution,
} from "@/lib/sync-runs";

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
        playlistsToUpdate.set(managedPlaylist.externalPlaylistId, {
          type: "managed",
          id: managedPlaylist.id,
          playlist: managedPlaylist,
          spotifyId: managedPlaylist.externalPlaylistId,
        });
      }

      // Check source playlists (with deduplication)
      managedPlaylist.subscriptions.forEach((subsription) => {
        const source = subsription.sourcePlaylist;

        if (
          !seenSourcePlaylists.has(source.externalPlaylistId) &&
          now.getTime() - source.lastMetadataRefreshAt.getTime() >
            staleThresholds.sourcePlaylist
        ) {
          seenSourcePlaylists.add(source.externalPlaylistId);
          playlistsToUpdate.set(source.externalPlaylistId, {
            type: "source",
            id: source.id,
            playlist: source,
            spotifyId: source.externalPlaylistId,
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

    // Attach the per-run sync log so Library rows / the detail page can show
    // real status, and per-source contribution over the last 30 days.
    const playlistIds = subscriptions.map((p) => p.id);
    if (playlistIds.length) {
      const [latestRuns, contribRuns] = await Promise.all([
        Promise.all(
          playlistIds.map((id) =>
            prisma.syncRun.findFirst({
              where: { managedPlaylistId: id },
              orderBy: { startedAt: "desc" },
            }),
          ),
        ),
        prisma.syncRun.findMany({
          where: {
            managedPlaylistId: { in: playlistIds },
            status: "SUCCESS",
            startedAt: {
              gte: new Date(Date.now() - CONTRIBUTION_WINDOW_MS),
            },
          },
          select: { managedPlaylistId: true, sourceBreakdown: true },
        }),
      ]);

      const lastRunByPlaylist = new Map(
        latestRuns
          .filter((r): r is NonNullable<typeof r> => Boolean(r))
          .map((r) => [r.managedPlaylistId, toSyncRunSummary(r)]),
      );

      const contributionsByPlaylist = new Map<
        string,
        Record<string, number>
      >();
      for (const run of contribRuns) {
        const rows = Array.isArray(run.sourceBreakdown)
          ? (run.sourceBreakdown as unknown as SourceContribution[])
          : [];
        const acc =
          contributionsByPlaylist.get(run.managedPlaylistId) ?? {};
        for (const row of rows) {
          acc[row.sourcePlaylistId] =
            (acc[row.sourcePlaylistId] ?? 0) + (row.added ?? 0);
        }
        contributionsByPlaylist.set(run.managedPlaylistId, acc);
      }

      subscriptions.forEach((p) => {
        (p as any).lastRun = lastRunByPlaylist.get(p.id) ?? null;
        (p as any).contributions =
          contributionsByPlaylist.get(p.id) ?? {};
      });
    }

    return NextResponse.json(subscriptions);
  } catch (error) {
    return Response.json(error);
  }
}
