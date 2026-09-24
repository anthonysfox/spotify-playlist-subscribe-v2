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
import { randomUUID, timingSafeEqual } from "crypto";

// How many served-song identities a REPLACE subscription remembers. This only
// needs to cover one full rotation of a source playlist — it self-clears at that
// point — so this is purely a backstop against an enormous source.
const MAX_ROTATION_MEMORY = 1000;

/** Why a playlist was skipped. Skips are normal; they are not errors. */
type SkipReason =
  "NO_SUBSCRIPTIONS" | "PROVIDER_NOT_CONNECTED" | "REPLACE_UNSUPPORTED";

/** Per-source contribution for one run, stored on SyncRun.sourceBreakdown. */
interface SourceContribution {
  sourcePlaylistId: string;
  sourceName: string;
  added: number;
}

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

/**
 * Whether a request carries the cron secret.
 *
 * Fails closed when CRON_SECRET is unset. The previous check compared against
 * the template literal `Bearer ${process.env.CRON_SECRET}` directly, which with
 * no secret configured collapses to the string "Bearer undefined" — anyone
 * sending exactly that header was authenticated, and this endpoint accepts
 * `?userId=&playlistId=&force=true`, so that meant driving syncs against any
 * account. Worse, `lib/subscribe.ts` interpolates the same unset value when it
 * calls back in, so the app kept working normally and nothing ever surfaced the
 * missing variable.
 *
 * The comparison is constant-time. That's belt-and-braces rather than a fix for
 * a practical attack — remote timing analysis across a network is not how this
 * secret would realistically fall — but it's the right way to compare one.
 */
function isAuthorizedCronRequest(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    // Loud in the logs, opaque to the caller: an operator needs to see this,
    // but the response must not advertise that the server is misconfigured.
    console.error(
      "🔒 CRON_SECRET is not set — refusing every sync request. Syncs stay broken until it is configured.",
    );
    return false;
  }

  if (!authHeader) return false;

  const presented = Buffer.from(authHeader);
  const expected = Buffer.from(`Bearer ${secret}`);

  // timingSafeEqual throws on a length mismatch, and a differing length is
  // already a mismatch — the length of the header is not the secret.
  return (
    presented.length === expected.length && timingSafeEqual(presented, expected)
  );
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const entityId = randomUUID();

  try {
    // 1. Authentication - Verify cron request
    if (!isAuthorizedCronRequest(request.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get optional parameters
    const { searchParams } = request.nextUrl;
    const forceSync = searchParams.get("force") === "true";
    const specificUserId = searchParams.get("userId") || "";
    const specificPlaylistId = searchParams.get("playlistId") || "";
    const specificSourceId = searchParams.get("sourceId") || "";

    // A forced run is always something a person kicked off — "Sync now", or the
    // immediate sync right after subscribing. The bare cron never forces.
    const trigger: "SCHEDULED" | "MANUAL" = forceSync ? "MANUAL" : "SCHEDULED";

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
        batch.map((playlist) => syncSinglePlaylist(playlist, trigger)),
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
  trigger: "SCHEDULED" | "MANUAL",
): Promise<SyncResult> {
  const syncStartTime = Date.now();

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

  // Open the run log now, as RUNNING, so an in-flight sync is visible as
  // "Syncing now…" and doesn't only appear once it's finished. Best-effort —
  // a logging failure must never take down the sync itself.
  let syncRunId: string | null = null;
  try {
    const run = await prisma.syncRun.create({
      data: { managedPlaylistId: id, userId, status: "RUNNING", trigger },
    });
    syncRunId = run.id;
  } catch (e) {
    console.warn("Could not open sync run log:", e);
  }

  const closeRun = async (data: Prisma.SyncRunUncheckedUpdateInput) => {
    if (!syncRunId) return;
    try {
      await prisma.syncRun.update({
        where: { id: syncRunId },
        data: {
          ...data,
          finishedAt: new Date(),
          durationMs: Date.now() - syncStartTime,
        },
      });
    } catch (e) {
      console.warn("Could not close sync run log:", e);
    }
  };

  try {
    console.log(`🎵 Syncing: ${name} (${id})`);

    // Skip if no active subscriptions
    if (!subscriptions?.length) {
      console.log(`⚠️ Skipping ${name} - no active subscriptions`);
      await closeRun({ status: "SKIPPED", skipReason: "NO_SUBSCRIPTIONS" });
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

      await closeRun({
        status: "SKIPPED",
        skipReason: "PROVIDER_NOT_CONNECTED",
      });
      return {
        playlistId: id,
        playlistName: name,
        status: "skipped",
        songsAdded: 0,
        reason: "PROVIDER_NOT_CONNECTED",
        duration: Date.now() - syncStartTime,
      };
    }

    // REPLACE needs to empty the playlist first, and not every service can do
    // that — Apple Music's API has no track-removal endpoint at all. Rather than
    // silently degrading REPLACE into APPEND (which would grow the playlist
    // forever, the exact opposite of what the user asked for), skip it and say
    // so, so the setting can be corrected.
    if (syncMode === "REPLACE" && !client.capabilities.removeTracks) {
      console.warn(
        `⚠️ Skipping ${name} — ${provider} cannot remove tracks, so REPLACE mode is unsupported`,
      );

      await closeRun({ status: "SKIPPED", skipReason: "REPLACE_UNSUPPORTED" });
      return {
        playlistId: id,
        playlistName: name,
        status: "skipped",
        songsAdded: 0,
        reason: "REPLACE_UNSUPPORTED",
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
    // Skip tallies for the run log — these were computed and thrown away before.
    let skippedAlreadyPresent = 0;
    let skippedExplicit = 0;
    let skippedTooOld = 0;
    let skippedByVibe = 0;
    const sourceBreakdown: SourceContribution[] = [];

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
        skippedAlreadyPresent += sourceTracks.length - candidates.length;

        // Honour the two settings the UI has always offered but the sync engine
        // never actually read.
        if (explicitContentFilter) {
          const afterExplicit = withoutExplicit(candidates);
          skippedExplicit += candidates.length - afterExplicit.length;
          candidates = afterExplicit;
        }
        const afterAge = withinAgeLimit(candidates, trackAgeLimit ?? 0);
        skippedTooOld += candidates.length - afterAge.length;
        candidates = afterAge;

        // Collapse duplicates *within* the source playlist itself.
        const seenInSource = new Set<string>();
        const beforeSelfDedupe = candidates.length;
        candidates = candidates.filter((track) => {
          const identity = songIdentity(track);
          if (seenInSource.has(identity)) return false;

          seenInSource.add(identity);
          return true;
        });
        skippedAlreadyPresent += beforeSelfDedupe - candidates.length;

        // REPLACE mode rotates through the source instead of restarting from the
        // top every time.
        //
        // In APPEND mode the playlist itself records what has already been
        // served. REPLACE deletes the playlist's contents on every run, so that
        // record is gone — which is why it kept re-adding the same first N songs
        // and "replacing" the playlist with an identical one. This subscription's
        // own memory is what makes each run genuinely fresh.
        const alreadyServed = new Set<string>(
          subscription.recentlyServed ?? [],
        );

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
        const wantedFromSource = Math.min(
          candidates.length,
          syncQuantityPerSource,
        );
        const chosen = vibePrompt
          ? await selectByVibe(vibePrompt, candidates, syncQuantityPerSource)
          : candidates.slice(0, syncQuantityPerSource);
        // With a vibe, anything we would have taken but the model rejected.
        if (vibePrompt) {
          skippedByVibe += Math.max(0, wantedFromSource - chosen.length);
        }

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

        sourceBreakdown.push({
          sourcePlaylistId: sourcePlaylist.id,
          sourceName: sourcePlaylist.name,
          added: chosen.length,
        });

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
                  recentlyServed:
                    Array.from(alreadyServed).slice(-MAX_ROTATION_MEMORY),
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

    await closeRun({
      status: "SUCCESS",
      tracksAdded: totalTracksAdded,
      skippedAlreadyPresent,
      skippedExplicit,
      skippedTooOld,
      skippedByVibe,
      sourceBreakdown: sourceBreakdown as unknown as Prisma.InputJsonValue,
    });

    return {
      playlistId: id,
      playlistName: name,
      status: "success",
      songsAdded: totalTracksAdded,
      duration: Date.now() - syncStartTime,
    };
  } catch (error: any) {
    console.error(`❌ Failed to sync ${managedPlaylist.name}:`, error);
    await closeRun({
      status: "FAILED",
      errorCode: "SYNC_ERROR",
      errorMessage:
        error instanceof Error ? error.message : String(error ?? "Unknown"),
    });
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
