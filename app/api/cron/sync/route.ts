import getClerkOAuthToken from "utils/clerk";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { AuditLogger } from "@/lib/audit-logger";
import { addDays, addWeeks, addMonths } from "date-fns";

interface SyncResult {
  playlistId: string;
  playlistName: string;
  status: "success" | "failed" | "skipped";
  songsAdded: number;
  error?: string;
  duration: number;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authentication - Verify cron request
    const authHeader = request.headers.get("authorization");

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get optional parameters
    const { searchParams } = request.nextUrl;
    const forceSync = searchParams.get("force") === "true";
    const specificUserId = searchParams.get("userId");
    const specificPlaylistId = searchParams.get("playlistId");
    const specificSourceId = searchParams.get("sourceId");

    console.log(`🔄 Starting sync job at ${new Date().toISOString()}`, {
      forceSync,
      specificUserId,
      specificPlaylistId,
      specificSourceId,
    });

    // 3. Build query conditions
    const whereConditions: any = {
      deletedAt: null,
    };

    if (!forceSync) {
      whereConditions.OR = [
        { nextSyncTime: { lte: new Date() } },
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
      return NextResponse.json({
        success: true,
        message: "No playlists due for sync",
        processed: 0,
        results: [],
      });
    }

    // 5. Process playlists with rate limiting
    const results: SyncResult[] = [];
    const BATCH_SIZE = 3; // Reduce concurrent API calls

    for (let i = 0; i < playlistsToSync.length; i += BATCH_SIZE) {
      const batch = playlistsToSync.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map((playlist) => syncSinglePlaylist(playlist))
      );

      batchResults.forEach((result, index) => {
        const playlist = batch[index];

        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          console.error(
            `❌ Failed to sync playlist ${playlist.id}:`,
            result.reason
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
    const summary = {
      processed: results.length,
      successful: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "failed").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      totalSongsAdded: results.reduce((sum, r) => sum + r.songsAdded, 0),
      duration: Date.now() - startTime,
    };

    console.log(`✅ Sync job completed:`, summary);

    // 7. Log to audit trail
    // await AuditLogger.logBulkSync(summary, results.slice(0, 20)); // Limit audit log size

    return NextResponse.json({
      success: true,
      message: `Sync completed: ${summary.successful}/${summary.processed} playlists synced successfully`,
      ...summary,
      results: results.slice(0, 10), // Limit response size
    });
  } catch (error: any) {
    console.error("❌ Sync job failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Sync job failed",
        message: error.message,
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// Individual playlist sync with improved error handling
async function syncSinglePlaylist(managedPlaylist: any): Promise<SyncResult> {
  const syncStartTime = Date.now();

  try {
    const {
      id,
      name,
      syncQuantityPerSource,
      userId,
      subscriptions,
      spotifyPlaylistId,
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
        duration: Date.now() - syncStartTime,
      };
    }

    // Get user's Spotify token
    const { token } = await getClerkOAuthToken(userId);
    if (!token) {
      throw new Error(`No valid Spotify token for user ${userId}`);
    }

    // Get current tracks in managed playlist
    const managedPlaylistTrackIDs = await getTracks(spotifyPlaylistId, token);

    let totalTracksAdded = 0;

    // Process each subscription
    for (const subscription of subscriptions) {
      try {
        const { sourcePlaylist } = subscription;

        // Get tracks from source playlist
        const sourcePlaylistTrackIDs = await getTracks(
          sourcePlaylist.spotifyPlaylistId,
          token
        );

        if (!sourcePlaylistTrackIDs?.size) {
          console.log(`⚠️ No tracks found in source: ${sourcePlaylist.name}`);
          continue;
        }

        // Find new tracks to add
        const tracksToAdd: string[] = [];
        for (const trackId of sourcePlaylistTrackIDs) {
          if (managedPlaylistTrackIDs?.has(trackId)) continue;
          if (tracksToAdd.length >= syncQuantityPerSource) break;

          tracksToAdd.push(`spotify:track:${trackId}`);
        }

        // Add tracks to managed playlist
        if (tracksToAdd.length > 0) {
          await addTracksToPlaylist(spotifyPlaylistId, tracksToAdd, token);
          totalTracksAdded += tracksToAdd.length;

          // Update our local cache of managed playlist tracks
          tracksToAdd.forEach((uri) => {
            const trackId = uri.replace("spotify:track:", "");
            managedPlaylistTrackIDs?.add(trackId);
          });

          console.log(
            `  ➕ Added ${tracksToAdd.length} tracks from ${sourcePlaylist.name}`
          );
        }

        // Update subscription sync timestamp
        await prisma.managedPlaylistSourceSubscription.update({
          where: { id: subscription.id },
          data: { lastSyncedFromSourceAt: new Date() },
        });
      } catch (subscriptionError: any) {
        console.error(
          `❌ Failed to sync from source ${subscription.sourcePlaylist.name}:`,
          subscriptionError.message
        );
        // Continue with other sources even if one fails
      }
    }

    // Refresh playlist metadata from Spotify if tracks were added
    let updatedImageUrl = managedPlaylist.imageUrl;
    if (totalTracksAdded > 0) {
      try {
        const playlistResponse = await fetch(
          `${process.env.BASE_SPOTIFY_URL}/playlists/${spotifyPlaylistId}?fields=images,tracks.total`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (playlistResponse.ok) {
          const playlistData = await playlistResponse.json();
          updatedImageUrl =
            playlistData.images?.[0]?.url || managedPlaylist.imageUrl;
        }
      } catch (error) {
        console.warn("Failed to refresh playlist metadata:", error);
      }
    }

    // Update managed playlist sync metadata
    const nextSyncTime = calculateNextSyncTime(managedPlaylist.syncInterval);
    await prisma.managedPlaylist.update({
      where: { id },
      data: {
        lastSyncCompletedAt: new Date(),
        nextSyncTime,
        trackCount: (managedPlaylist.trackCount || 0) + totalTracksAdded,
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

// Helper function to calculate next sync time
function calculateNextSyncTime(interval: string): Date {
  const now = new Date();

  switch (interval) {
    case "DAILY":
      return addDays(now, 1);
    case "WEEKLY":
      return addWeeks(now, 1);
    case "MONTHLY":
      return addMonths(now, 1);
    default:
      return addWeeks(now, 1); // Default to weekly
  }
}

// Improved getTracks with better error handling
const getTracks = async (
  spotifyPlaylistId: string,
  token: string
): Promise<Set<string> | null> => {
  try {
    const spotifyUrl = `${process.env.BASE_SPOTIFY_URL}/playlists/${spotifyPlaylistId}/tracks?fields=items(track(id)),next&limit=50`;
    let allTrackIds = new Set<string>();
    let nextUrl: string | null = spotifyUrl;

    // Handle pagination to get all tracks
    while (nextUrl) {
      const spotifyResponse = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!spotifyResponse.ok) {
        if (spotifyResponse.status === 404) {
          console.error(`❌ Playlist ${spotifyPlaylistId} not found`);
          return null;
        }
        throw new Error(
          `Spotify API error: ${spotifyResponse.status} ${spotifyResponse.statusText}`
        );
      }

      const data = await spotifyResponse.json();

      // Add track IDs to set
      if (data.items) {
        data.items.forEach((item: any) => {
          if (item?.track?.id) {
            allTrackIds.add(item.track.id);
          }
        });
      }

      nextUrl = data.next; // Get next page URL or null
    }

    return allTrackIds;
  } catch (error: any) {
    console.error(
      `❌ Failed to get tracks from playlist ${spotifyPlaylistId}:`,
      error.message
    );
    throw error;
  }
};

// Improved addTracksToPlaylist with better error handling
const addTracksToPlaylist = async (
  managedPlaylistId: string,
  tracks: string[],
  token: string
): Promise<boolean> => {
  try {
    const spotifyUrl = `${process.env.BASE_SPOTIFY_URL}/playlists/${managedPlaylistId}/tracks`;

    // Spotify allows max 100 tracks per request
    const BATCH_SIZE = 100;

    for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
      const batch = tracks.slice(i, i + BATCH_SIZE);

      const spotifyResponse = await fetch(spotifyUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ uris: batch }),
      });

      if (!spotifyResponse.ok) {
        const errorData = await spotifyResponse.json();
        throw new Error(
          `Failed to add tracks: ${spotifyResponse.status} ${JSON.stringify(
            errorData
          )}`
        );
      }

      // Small delay between batches to be respectful to API
      if (i + BATCH_SIZE < tracks.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return true;
  } catch (error: any) {
    console.error(
      `❌ Failed to add tracks to playlist ${managedPlaylistId}:`,
      error.message
    );
    throw error;
  }
};
