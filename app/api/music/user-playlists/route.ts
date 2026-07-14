import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProvider, type MusicProvider } from "@/lib/music";

/**
 * The user's own playlists on a service — the candidate *destinations* for a
 * subscription. Provider-generic, same as /api/music/search.
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const provider = (searchParams.get("provider") ?? "SPOTIFY") as MusicProvider;
  const limit = Number(searchParams.get("limit") ?? 20);
  const offset = Number(searchParams.get("offset") ?? 0);

  try {
    const client = await getProvider(provider).forUser(userId);

    if (!client) {
      return NextResponse.json(
        { error: `${provider} is not connected`, connected: false },
        { status: 409 },
      );
    }

    return NextResponse.json({
      provider,
      playlists: await client.getUserPlaylists(limit, offset),
      // The UI needs this to hide "replace" mode where the service can't do it.
      capabilities: client.capabilities,
    });
  } catch (error: any) {
    console.error(`Failed to list ${provider} playlists:`, error.message);

    return NextResponse.json(
      { error: "Failed to list playlists" },
      { status: 500 },
    );
  }
}
