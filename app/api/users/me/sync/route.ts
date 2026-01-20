import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { success: false, error: "CRON_SECRET is not configured" },
      { status: 500 }
    );
  }

  try {
    const origin = request.nextUrl.origin;
    const syncUrl = `${origin}/api/cron/sync?force=true&userId=${encodeURIComponent(
      userId
    )}`;

    const syncResponse = await fetch(syncUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
        "Content-Type": "application/json",
      },
    });

    const data = await syncResponse.json();

    return NextResponse.json(data, { status: syncResponse.status });
  } catch (error: any) {
    console.error("Failed to trigger sync:", error);
    return NextResponse.json(
      { success: false, error: "Failed to trigger sync" },
      { status: 500 }
    );
  }
}
