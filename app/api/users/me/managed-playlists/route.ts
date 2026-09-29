import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getManagedPlaylistsForUser } from "@/lib/playlists/managed";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  try {
    return NextResponse.json(await getManagedPlaylistsForUser(userId));
  } catch (error) {
    console.error("GET /api/users/me/managed-playlists failed:", error);
    return NextResponse.json([], { status: 500 });
  }
}
