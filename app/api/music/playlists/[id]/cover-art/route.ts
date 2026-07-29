import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { getProvider } from "@/lib/music";
import { generatePlaylistCover, isCoverArtConfigured } from "@/lib/cover-art";

// sharp needs the Node runtime (not edge), and image generation is slow enough
// to want a generous ceiling.
export const runtime = "nodejs";
export const maxDuration = 60;

/** The managed playlist for `id`, but only if `userId` owns it. */
async function loadOwnedPlaylist(userId: string, id: string) {
  return prisma.managedPlaylist.findFirst({
    where: { id, userId, deletedAt: null },
  });
}

/**
 * Cover-art generation is an experimental, admin-only feature — it spends money
 * per image, so it's gated to a single operator rather than exposed to every
 * user. Enforced server-side; the UI hiding the button is only cosmetic.
 */
function isAdmin(userId: string): boolean {
  return userId === process.env.NEXT_PUBLIC_ADMIN_USER_ID;
}

/**
 * POST — generate cover art and return it as a preview. Nothing is written to
 * the music service here; the client uploads it via PUT once the user confirms.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isAdmin(userId))
    return NextResponse.json({ error: "Not available" }, { status: 403 });

  if (!isCoverArtConfigured()) {
    return NextResponse.json(
      { error: "Cover-art generation isn't configured on this server." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const playlist = await loadOwnedPlaylist(userId, id);
  if (!playlist)
    return NextResponse.json({ error: "Playlist not found" }, { status: 404 });

  const client = await getProvider(playlist.provider).forUser(userId);
  if (!client)
    return NextResponse.json(
      { error: `${playlist.provider} is not connected` },
      { status: 400 },
    );

  if (!client.capabilities.setCoverImage) {
    return NextResponse.json(
      {
        error: `${playlist.provider} can't have a custom cover set through its API.`,
      },
      { status: 400 },
    );
  }

  try {
    const tracks = await client.getPlaylistTracks(playlist.externalPlaylistId);

    if (tracks.length === 0) {
      return NextResponse.json(
        { error: "This playlist has no tracks to base cover art on yet." },
        { status: 422 },
      );
    }

    const { jpegBase64, prompt } = await generatePlaylistCover({
      playlistName: playlist.name,
      tracks,
      vibePrompt: playlist.vibePrompt,
    });

    // `image` is a ready-to-render data URL; `jpegBase64` is the exact payload
    // the client sends back to PUT if they keep it.
    return NextResponse.json({
      image: `data:image/jpeg;base64,${jpegBase64}`,
      jpegBase64,
      prompt,
    });
  } catch (error: any) {
    console.error("Cover art generation failed:", error);
    return NextResponse.json(
      { error: error?.message ?? "Cover art generation failed" },
      { status: 500 },
    );
  }
}

/**
 * PUT — upload a previously generated cover (base64 JPEG) to the music service.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isAdmin(userId))
    return NextResponse.json({ error: "Not available" }, { status: 403 });

  const { id } = await params;
  const playlist = await loadOwnedPlaylist(userId, id);
  if (!playlist)
    return NextResponse.json({ error: "Playlist not found" }, { status: 404 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const jpegBase64 = body?.jpegBase64;
  if (typeof jpegBase64 !== "string" || jpegBase64.length === 0) {
    return NextResponse.json(
      { error: "Missing jpegBase64 in request body" },
      { status: 400 },
    );
  }

  const client = await getProvider(playlist.provider).forUser(userId);
  if (!client || !client.capabilities.setCoverImage) {
    return NextResponse.json(
      {
        error: `${playlist.provider} can't have a custom cover set through its API.`,
      },
      { status: 400 },
    );
  }

  try {
    await client.setPlaylistCover(playlist.externalPlaylistId, jpegBase64);

    // Spotify serves the new cover from its own CDN after a short delay and
    // doesn't return the URL on upload, so we leave `imageUrl` for the next
    // metadata refresh rather than fabricating one. Nudge that refresh sooner.
    await prisma.managedPlaylist.update({
      where: { id: playlist.id },
      data: { lastMetadataRefreshAt: new Date(0) },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Cover art upload failed:", error);
    return NextResponse.json(
      { error: error?.message ?? "Cover art upload failed" },
      { status: 500 },
    );
  }
}
