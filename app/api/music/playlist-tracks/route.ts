import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProvider, type MusicProvider } from "@/lib/music";

/**
 * A playlist's tracks, for the "view tracks" preview. Provider-generic — the
 * sync engine already reads tracks through MusicClient, and so does this.
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const playlistId = searchParams.get("id");
  const provider = (searchParams.get("provider") ?? "SPOTIFY") as MusicProvider;

  if (!playlistId) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    const client = await getProvider(provider).forUser(userId);

    if (!client) {
      return NextResponse.json(
        { error: `${provider} is not connected` },
        { status: 409 },
      );
    }

    return NextResponse.json({
      tracks: await client.getPlaylistTracks(playlistId),
    });
  } catch (error: any) {
    console.error(`Failed to read tracks on ${provider}:`, error.message);

    return NextResponse.json({ error: "Failed to load tracks" }, { status: 500 });
  }
}
