import prisma from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getProvider } from "@/lib/music";
import { NextRequest, NextResponse } from "next/server";
import { AuditLogger } from "@/lib/audit-logger";
import { calculateNextSyncTime } from "@/lib/sync/schedule";
import {
  rotateUnseen,
  songIdentity,
  withinAgeLimit,
  withoutExplicit,
  type PlaylistTrack,
} from "@/lib/sync/track-filters";
import { selectByVibe } from "@/lib/sync/curator";
import { randomUUID, timingSafeEqual } from "crypto";
import { runSync } from "@/lib/sync/engine";

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

export const maxDuration = 300;

export async function GET(request: NextRequest) {
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

    const summary = await runSync({
      force: forceSync,
      specificUserId,
      specificPlaylistId,
      specificSourceId,
    });

    return NextResponse.json({
      success: true,
      message:
        summary.processed === 0
          ? "No playlists due to sync"
          : `Sync completed: ${summary.successful}/${summary.processed} playlists synced successfully`,
      ...summary,
      results: summary.results.slice(0, 10),
    });
  } catch (error: any) {
    const errorMessage =
      error instanceof Error ? error.message : String(error || "Unknown error");

    console.error("❌ Sync job failed:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: "Sync job failed",
        message: errorMessage,
      },
      { status: 500 },
    );
  }
}
