import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { toSyncRunSummary } from "@/lib/sync-runs";

/**
 * Every sync run across all of the user's playlists, newest first — the
 * Activity feed. Cursor-paginated on the run id.
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit")) || 30, 1),
    100,
  );
  const cursor = searchParams.get("cursor") || undefined;

  const runs = await prisma.syncRun.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      managedPlaylist: {
        select: { id: true, name: true, imageUrl: true, provider: true },
      },
    },
  });

  const hasMore = runs.length > limit;
  const page = hasMore ? runs.slice(0, limit) : runs;

  return NextResponse.json({
    runs: page.map((r) => ({
      ...toSyncRunSummary(r),
      playlist: r.managedPlaylist,
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
}
