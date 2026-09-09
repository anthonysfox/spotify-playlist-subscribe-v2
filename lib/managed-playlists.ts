import getClerkOAuthToken from "utils/clerk";
import prisma from "@/lib/prisma";
import {
  CONTRIBUTION_WINDOW_MS,
  toSyncRunSummary,
  type SourceContribution,
} from "@/lib/sync-runs";

// How long provider metadata (track counts, cover art) is trusted before it's
// refreshed inline from the music service. The refresh is N external API calls
// + Prisma writes on the critical path of a Library / dashboard load, so it has
// to be rare — a short window means almost every page load pays for it.
const staleThresholds = {
  managedPlaylist: 30 * 60 * 1000, // 30 minutes
  sourcePlaylist: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * The user's managed playlists with sources, provider-metadata kept fresh, and
 * the sync-run log attached (`lastRun`, `contributions`).
 *
 * Called directly by server components (AppFrame) and by the
 * `/api/users/me/managed-playlists` route — no self-fetch HTTP hop.
 */
export async function getManagedPlaylistsForUser(userId: string) {
  const subscriptions = await prisma.managedPlaylist.findMany({
    where: { userId },
    include: {
      subscriptions: {
        where: { sourcePlaylist: { deletedAt: null } },
        include: { sourcePlaylist: true },
      },
    },
  });

  await refreshStaleMetadata(userId, subscriptions);
  await attachSyncRunLog(subscriptions);

  return subscriptions;
}

type WithSubs = Awaited<ReturnType<typeof getManagedPlaylistsForUser>>;

async function refreshStaleMetadata(userId: string, subscriptions: WithSubs) {
  const now = Date.now();
  const toUpdate = new Map<string, any>();
  const seenSources = new Set<string>();

  for (const mp of subscriptions) {
    if (
      now - mp.lastMetadataRefreshAt.getTime() >
      staleThresholds.managedPlaylist
    ) {
      toUpdate.set(mp.externalPlaylistId, {
        type: "managed",
        id: mp.id,
        playlist: mp,
        spotifyId: mp.externalPlaylistId,
      });
    }
    for (const sub of mp.subscriptions) {
      const src = sub.sourcePlaylist;
      if (
        !seenSources.has(src.externalPlaylistId) &&
        now - src.lastMetadataRefreshAt.getTime() >
          staleThresholds.sourcePlaylist
      ) {
        seenSources.add(src.externalPlaylistId);
        toUpdate.set(src.externalPlaylistId, {
          type: "source",
          id: src.id,
          playlist: src,
          spotifyId: src.externalPlaylistId,
        });
      }
    }
  }

  if (toUpdate.size === 0) return;

  // Apple-only users have no Spotify token — the refresh simply doesn't run.
  let token: string | undefined;
  try {
    token = (await getClerkOAuthToken(userId)).token;
  } catch {
    return;
  }
  if (!token) return;

  await Promise.all(
    Array.from(toUpdate.values()).map(async ({ spotifyId, playlist, id, type }) => {
      try {
        const res = await fetch(
          `https://api.spotify.com/v1/playlists/${spotifyId}?fields=tracks.total`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return;
        const data = await res.json();
        const updateData = {
          trackCount: data.tracks.total,
          lastMetadataRefreshAt: new Date(),
        };
        if (type === "managed") {
          await prisma.managedPlaylist.update({ where: { id }, data: updateData });
        } else {
          await prisma.sourcePlaylist.update({ where: { id }, data: updateData });
        }
        playlist.trackCount = data.tracks.total;
        playlist.lastMetadataRefreshAt = new Date();
      } catch (error) {
        console.error(`Failed to refresh ${type} playlist ${id}:`, error);
      }
    }),
  );
}

async function attachSyncRunLog(subscriptions: WithSubs) {
  const playlistIds = subscriptions.map((p) => p.id);
  if (playlistIds.length === 0) return;

  // Wrapped: before the sync_runs migration is applied these queries throw, and
  // a missing log must not take down the Library.
  try {
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
          startedAt: { gte: new Date(Date.now() - CONTRIBUTION_WINDOW_MS) },
        },
        select: { managedPlaylistId: true, sourceBreakdown: true },
      }),
    ]);

    const lastRunByPlaylist = new Map(
      latestRuns
        .filter((r): r is NonNullable<typeof r> => Boolean(r))
        .map((r) => [r.managedPlaylistId, toSyncRunSummary(r)]),
    );

    const contributionsByPlaylist = new Map<string, Record<string, number>>();
    for (const run of contribRuns) {
      const rows = Array.isArray(run.sourceBreakdown)
        ? (run.sourceBreakdown as unknown as SourceContribution[])
        : [];
      const acc = contributionsByPlaylist.get(run.managedPlaylistId) ?? {};
      for (const row of rows) {
        acc[row.sourcePlaylistId] =
          (acc[row.sourcePlaylistId] ?? 0) + (row.added ?? 0);
      }
      contributionsByPlaylist.set(run.managedPlaylistId, acc);
    }

    subscriptions.forEach((p) => {
      (p as any).lastRun = lastRunByPlaylist.get(p.id) ?? null;
      (p as any).contributions = contributionsByPlaylist.get(p.id) ?? {};
    });
  } catch (runErr) {
    console.warn("sync-run enrichment skipped:", runErr);
  }
}
