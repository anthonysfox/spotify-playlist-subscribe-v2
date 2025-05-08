import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import getClerkOAuthToken from "utils/clerk";
import { OFFSET } from "utils/constants";

export async function GET(request: Request) {
  const { userId } = auth();

  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const searchText = searchParams.get("searchText");
  const offset = searchParams.get("offset") || 0;

  try {
    const token = await getClerkOAuthToken();

    const spotifyUrl = `${process.env.BASE_SPOTIFY_URL}/search?q=${searchText}&type=playlist&limit=${OFFSET}&offset=${offset}`;
    const spotifyResponse = await fetch(spotifyUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await spotifyResponse.json();
    return NextResponse.json([...data.playlists.items]);
  } catch (error) {
    return Response.json(error);
  }
}
