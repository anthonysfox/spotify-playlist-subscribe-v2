import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProvider, type MusicProvider } from "@/lib/music";

/**
 * Search a music service for playlists to subscribe to.
 *
 * Deliberately provider-generic rather than a second copy of the Spotify search
 * route: the client is resolved from `?provider=`, and everything downstream
 * speaks PlaylistSummary. Adding a third service would need no new route.
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q")?.trim();
  const provider = (searchParams.get("provider") ?? "SPOTIFY") as MusicProvider;
  const limit = Number(searchParams.get("limit") ?? 20);

  if (!query) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }

  try {
    const client = await getProvider(provider).forUser(userId);

    // Not connected is an ordinary state, not an error — the UI shows a connect
    // prompt rather than a failure.
    if (!client) {
      return NextResponse.json(
        { error: `${provider} is not connected`, connected: false },
        { status: 409 },
      );
    }

    return NextResponse.json({
      provider,
      playlists: await client.searchPlaylists(query, limit),
    });
  } catch (error: any) {
    console.error(`Search failed on ${provider}:`, error.message);

    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
