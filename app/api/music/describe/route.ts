import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProvider, type MusicProvider } from "@/lib/music";
import { describePlaylist } from "@/lib/describe-playlist";

/**
 * GET /api/music/describe?playlistId=<provider id>&provider=SPOTIFY
 *
 * Returns a lightweight "what's this like" for a single playlist — top artists +
 * a few sample tracks. Meant to be called lazily by the UI (e.g. when a card is
 * expanded), one playlist at a time, since each call fetches that playlist's
 * tracks from the provider.
 */
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const playlistId = searchParams.get("playlistId");
  const provider = (searchParams.get("provider") ?? "SPOTIFY") as MusicProvider;

  if (!playlistId)
    return NextResponse.json(
      { error: "playlistId is required" },
      { status: 400 },
    );

  const client = await getProvider(provider).forUser(userId);
  if (!client)
    return NextResponse.json(
      { error: `${provider} is not connected` },
      { status: 400 },
    );

  try {
    const tracks = await client.getPlaylistTracks(playlistId);
    return NextResponse.json(describePlaylist(tracks));
  } catch (error: any) {
    console.error("describe failed:", error);
    return NextResponse.json(
      { error: error?.message ?? "Couldn't describe playlist" },
      { status: 500 },
    );
  }
}
