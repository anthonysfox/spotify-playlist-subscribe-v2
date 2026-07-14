import prisma from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getProvider } from "@/lib/music";
import { NextRequest, NextResponse } from "next/server";
import { AuditLogger } from "@/lib/audit-logger";
import { calculateNextSyncTime } from "utils/sync-schedule";
import {
  rotateUnseen,
  songIdentity,
  withinAgeLimit,
  withoutExplicit,
  type PlaylistTrack,
} from "@/lib/track-filters";
import { selectByVibe } from "@/lib/curator";
import { randomUUID } from "crypto";

// How many served-song identities a REPLACE subscription remembers. This only
// needs to cover one full rotation of a source playlist — it self-clears at that
// point — so this is purely a backstop against an enormous source.
const MAX_ROTATION_MEMORY = 1000;

/** Why a playlist was skipped. Skips are normal; they are not errors. */
type SkipReason = "NO_SUBSCRIPTIONS" | "PROVIDER_NOT_CONNECTED";

interface SyncResult {
  playlistId: string;
  playlistName: string;
  status: "success" | "failed" | "skipped";
  songsAdded: number;
  /** Set when status is "skipped". */
  reason?: SkipReason;
  error?: string;
  duration: number;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const entityId = randomUUID();

  try {
    // 1. Authentication - Verify cron request
    const authHeader = request.headers.get("authorization");

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get optional parameters
    const { searchParams } = request.nextUrl;
    const forceSync = searchParams.get("force") === "true";
    const specificUserId = searchParams.get("userId") || "";
    const specificPlaylistId = searchParams.get("playlistId") || "";
    const specificSourceId = searchParams.get("sourceId") || "";

    console.log(`🔄 Starting sync job at ${new Date().toISOString()}`, {
      forceSync,
      specificUserId,
      specificPlaylistId,
      specificSourceId,
    });
    await AuditLogger.logBulkSyncStarted(
      {
        forceSync,
        userId: specificUserId,
        playlistId: specificPlaylistId,
        sourceId: specificSourceId,
      },
      entityId,
    );

    // 3. Build query conditions
    const whereConditions: any = {
      deletedAt: null,
    };

    if (!forceSync) {
      whereConditions.OR = [
        { nextSyncTime: { lte: new Date() } }, // Sync if next sync time is in the past
        { nextSyncTime: null }, // Never synced playlists
      ];
    }

    if (specificUserId) {
      whereConditions.userId = specificUserId;
    }

    if (specificPlaylistId) {
      whereConditions.id = specificPlaylistId;
    }

    // 4. Fetch playlists to sync
    const playlistsToSync = await prisma.managedPlaylist.findMany({
      where: whereConditions,
      include: {
        user: {
          select: { timezone: true },
        },
        subscriptions: {
          where: {
            sourcePlaylist: {
              deletedAt: null,
              ...(specificSourceId ? { id: specificSourceId } : {}),
            },
          },
          include: { sourcePlaylist: true },
        },
      },
      orderBy: { lastSyncCompletedAt: "asc" }, // Sync oldest first
    });

    console.log(`📋 Found ${playlistsToSync.length} playlists to sync`);

    if (playlistsToSync.length === 0) {
      const summary = {
        successful: 0,
        processed: 0,
        totalSongsAdded: 0,
        duration: Date.now() - startTime,
        skipped: 0,
        failed: 0,
      };
      const context = {
        reason: "no_due_playlists",
      };
      await AuditLogger.logBulkSyncCompleted(summary, entityId, context);

      return NextResponse.json({
        success: true,
        message: "No playlists due to sync",
      });
    }

    // 5. Process playlists with rate limiting
    const results: SyncResult[] = [];
    const BATCH_SIZE = 3; // Reduce concurrent API calls

    for (let i = 0; i < playlistsToSync.length; i += BATCH_SIZE) {
      const batch = playlistsToSync.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map((playlist) => syncSinglePlaylist(playlist)),
      );

      batchResults.forEach((result, index) => {
        const playlist = batch[index];

        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          console.error(
            `❌ Failed to sync playlist ${playlist.id}:`,
            result.reason,
          );
          results.push({
            playlistId: playlist.id,
            playlistName: playlist.name,
            status: "failed",
            songsAdded: 0,
            error: result.reason?.message || "Unknown error",
            duration: 0,
          });
        }
      });

      // Rate limiting between batches
      if (i + BATCH_SIZE < playlistsToSync.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // 6. Generate summary
    //
    // `needsReconnect` is called out separately from `failed` on purpose. These
    // playlists are not broken — their owner's connection to the music service
    // lapsed and only the user can restore it (Apple Music tokens expire after
    // ~6 months with no server-side renewal). Burying that in a generic failure
    // count is how a user ends up silently un-synced for months.
    const needsReconnect = results.filter(
      (r) => r.reason === "PROVIDER_NOT_CONNECTED",
    );

    const summary = {
      processed: results.length,
      successful: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "failed").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      needsReconnect: needsReconnect.length,
      totalSongsAdded: results.reduce((sum, r) => sum + r.songsAdded, 0),
      duration: Date.now() - startTime,
    };

    if (needsReconnect.length > 0) {
      console.warn(
        `🔌 ${needsReconnect.length} playlist(s) skipped: owner must reconnect their music service`,
      );
    }

    console.log(`✅ Sync job completed:`, summary);

    // 7. Log to audit trail
    await AuditLogger.logBulkSyncCompleted(summary, entityId); // Limit audit log size

    return NextResponse.json({
      success: true,
      message: `Sync completed: ${summary.successful}/${summary.processed} playlists synced successfully`,
      ...summary,
      results: results.slice(0, 10), // Limit response size
    });
  } catch (error: any) {
    const errorMessage =
      error instanceof Error ? error.message : String(error || "Unknown error");

    console.error("❌ Sync job failed:", errorMessage);

    await AuditLogger.logBulkSyncFailed(
      {
        status: "failed",
        error: errorMessage,
        duration: Date.now() - startTime,
      },
      entityId,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Sync job failed",
        message: errorMessage,
        duration: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

/**
 * Exactly the shape the sync query returns.
 *
 * This used to be `any`, which is precisely why `explicitContentFilter` and
 * `trackAgeLimit` could sit unread in this function for months without anything
 * complaining. Naming the type means the compiler now checks that every setting
 * a playlist has is one this function has actually accounted for.
 */
type PlaylistToSync = Prisma.ManagedPlaylistGetPayload<{
  include: {
    user: { select: { timezone: true } };
    subscriptions: { include: { sourcePlaylist: true } };
  };
}>;

// Individual playlist sync with improved error handling
async function syncSinglePlaylist(
  managedPlaylist: PlaylistToSync,
): Promise<SyncResult> {
  const syncStartTime = Date.now();

  try {
    const {
      id,
      name,
      syncQuantityPerSource,
      userId,
      subscriptions,
      provider,
      externalPlaylistId,
      syncMode,
      explicitContentFilter,
      trackAgeLimit,
      vibePrompt,
    } = managedPlaylist;

    console.log(`🎵 Syncing: ${name} (${id})`);

    // Skip if no active subscriptions
    if (!subscriptions?.length) {
      console.log(`⚠️ Skipping ${name} - no active subscriptions`);
      return {
        playlistId: id,
        playlistName: name,
        status: "skipped",
        songsAdded: 0,
        reason: "NO_SUBSCRIPTIONS",
        duration: Date.now() - syncStartTime,
      };
    }

    // Resolve a client for whichever service this playlist lives on. Everything
    // below this line is provider-agnostic — it works in terms of tracks, not
    // Spotify.
    const client = await getProvider(provider).forUser(userId);

    // A missing client means the user's connection to this service is gone —
    // never granted, revoked, or (on Apple Music) simply aged out: Music User
    // Tokens expire after ~6 months and cannot be renewed server-side.
    //
    // That is an expected state, not a system failure, so it must not be thrown.
    // Throwing here would log an expired user as a *failed* sync on every run
    // forever — indistinguishable from a real outage, and drowning genuine
    // errors in noise. Skip them, and say why, so the reconnect can be surfaced.
    if (!client) {
      console.log(
        `⚠️ Skipping ${name} — ${userId} has no valid ${provider} connection (needs reconnect)`,
      );

      return {
        playlistId: id,
        playlistName: name,
        status: "skipped",
        songsAdded: 0,
        reason: "PROVIDER_NOT_CONNECTED",
        duration: Date.now() - syncStartTime,
      };
    }

    // Get current tracks in managed playlist
    const managedTracks = await client.getPlaylistTracks(externalPlaylistId);

    if (syncMode === "REPLACE" && managedTracks.length) {
      await client.removeTracks(
        externalPlaylistId,
        managedTracks.map((track) => track.id),
      );
    }

    // Everything already on the playlist, keyed by song identity rather than by
    // track ID. Spotify gives a remaster, a radio edit and the album cut three
    // different IDs for what a listener hears as one song — matching on ID alone
    // is why the same track kept reappearing.
    // After a REPLACE the playlist is empty, so nothing counts as already there.
    const existingSongs = new Set(
      syncMode === "REPLACE" ? [] : managedTracks.map(songIdentity),
    );

    let totalTracksAdded = 0;

    // Process each subscription
    for (const subscription of subscriptions) {
      try {
        const { sourcePlaylist } = subscription;

        // Get tracks from source playlist.
        //
        // Sources are read with the *managed* playlist's client, which is only
        // correct while both live on the same service. Cross-provider sources
        // (a Spotify playlist feeding an Apple Music playlist) would need track
        // matching by ISRC, so they are deliberately not supported yet.
        if (sourcePlaylist.provider !== provider) {
          console.warn(
            `⚠️ Skipping ${sourcePlaylist.name}: source is on ${sourcePlaylist.provider}, playlist is on ${provider}`,
          );
          continue;
        }

        const sourceTracks = await client.getPlaylistTracks(
          sourcePlaylist.externalPlaylistId,
        );

        if (!sourceTracks.length) {
          console.log(`⚠️ No tracks found in source: ${sourcePlaylist.name}`);
          continue;
        }

        // Drop anything we already have (in any of its release guises).
        let candidates = sourceTracks.filter(
          (track) => !existingSongs.has(songIdentity(track)),
        );

        // Honour the two settings the UI has always offered but the sync engine
        // never actually read.
        if (explicitContentFilter) candidates = withoutExplicit(candidates);
        candidates = withinAgeLimit(candidates, trackAgeLimit ?? 0);

        // Collapse duplicates *within* the source playlist itself.
        const seenInSource = new Set<string>();
        candidates = candidates.filter((track) => {
          const identity = songIdentity(track);
          if (seenInSource.has(identity)) return false;

          seenInSource.add(identity);
          return true;
        });

        // REPLACE mode rotates through the source instead of restarting from the
        // top every time.
        //
        // In APPEND mode the playlist itself records what has already been
        // served. REPLACE deletes the playlist's contents on every run, so that
        // record is gone — which is why it kept re-adding the same first N songs
        // and "replacing" the playlist with an identical one. This subscription's
        // own memory is what makes each run genuinely fresh.
        const alreadyServed = new Set<string>(subscription.recentlyServed ?? []);

        if (syncMode === "REPLACE") {
          const { pool, exhausted } = rotateUnseen(
            candidates,
            alreadyServed,
            syncQuantityPerSource,
          );

          // Source fully rotated through — wipe the memory and start a new cycle.
          if (exhausted) alreadyServed.clear();

          candidates = pool;
        }

        // With a vibe set, a model picks what genuinely fits. Without one, keep
        // the engine's original behaviour: whatever comes first in the playlist.
        const chosen = vibePrompt
          ? await selectByVibe(vibePrompt, candidates, syncQuantityPerSource)
          : candidates.slice(0, syncQuantityPerSource);

        // Add tracks to managed playlist
        if (chosen.length > 0) {
          await client.addTracks(
            externalPlaylistId,
            chosen.map((track) => track.id),
          );
          totalTracksAdded += chosen.length;

          // Remember what we just added, so a later source in this same run
          // can't hand us the same song again.
          chosen.forEach((track) => {
            existingSongs.add(songIdentity(track));
            alreadyServed.add(songIdentity(track));
          });

          console.log(
            `  ➕ Added ${chosen.length} tracks from ${sourcePlaylist.name}` +
              (vibePrompt ? " (vibe-matched)" : ""),
          );
        }

        // Update subscription sync timestamp
        await prisma.managedPlaylistSourceSubscription.update({
          where: { id: subscription.id },
          data: {
            lastSyncedFromSourceAt: new Date(),
            // Only REPLACE needs this memory, and it self-clears once the source
            // has been rotated through. The cap is a backstop against a source
            // that grows without bound.
            ...(syncMode === "REPLACE"
              ? {
                  recentlyServed: Array.from(alreadyServed).slice(
                    -MAX_ROTATION_MEMORY,
                  ),
                }
              : {}),
          },
        });
      } catch (subscriptionError: any) {
        console.error(
          `❌ Failed to sync from source ${subscription.sourcePlaylist.name}:`,
          subscriptionError.message,
        );
        // Continue with other sources even if one fails
      }
    }

    // Refresh playlist metadata from the provider if tracks were added
    let updatedImageUrl = managedPlaylist.imageUrl;
    if (totalTracksAdded > 0) {
      try {
        const refreshed = await client.getPlaylist(externalPlaylistId);
        updatedImageUrl = refreshed?.imageUrl || managedPlaylist.imageUrl;
      } catch (error) {
        console.warn("Failed to refresh playlist metadata:", error);
      }
    }

    // Update managed playlist sync metadata
    const nextSyncTime = calculateNextSyncTime(managedPlaylist.syncInterval, {
      timeZone: managedPlaylist.user?.timezone,
      customDays: managedPlaylist.customDays,
    });
    await prisma.managedPlaylist.update({
      where: { id },
      data: {
        lastSyncCompletedAt: new Date(),
        nextSyncTime,
        // REPLACE wiped the playlist first, so its new size is exactly what we
        // just added — adding to the old count would inflate it forever.
        trackCount:
          syncMode === "REPLACE"
            ? totalTracksAdded
            : (managedPlaylist.trackCount || 0) + totalTracksAdded,
        imageUrl: updatedImageUrl,
        lastMetadataRefreshAt: new Date(),
      },
    });

    console.log(`✅ ${name}: Added ${totalTracksAdded} songs`);

    return {
      playlistId: id,
      playlistName: name,
      status: "success",
      songsAdded: totalTracksAdded,
      duration: Date.now() - syncStartTime,
    };
  } catch (error: any) {
    console.error(`❌ Failed to sync ${managedPlaylist.name}:`, error);
    return {
      playlistId: managedPlaylist.id,
      playlistName: managedPlaylist.name,
      status: "failed",
      songsAdded: 0,
      error: error.message,
      duration: Date.now() - syncStartTime,
    };
  }
}
