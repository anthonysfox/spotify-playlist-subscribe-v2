import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { toSyncRunSummary } from "@/lib/sync-runs";

/**
 * Recent sync runs for one managed playlist — feeds the detail page's Runs tab
 * and the run-history bars on Overview.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Ownership check — the run rows carry userId, but go through the playlist so
  // a bad id is a clean 404 rather than an empty list.
  const playlist = await prisma.managedPlaylist.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!playlist) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const runs = await prisma.syncRun.findMany({
    where: { managedPlaylistId: id },
    orderBy: { startedAt: "desc" },
    take: 30,
  });

  return NextResponse.json({ runs: runs.map(toSyncRunSummary) });
}
