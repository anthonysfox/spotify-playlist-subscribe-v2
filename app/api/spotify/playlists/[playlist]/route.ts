import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import getClerkOAuthToken from "utils/clerk";

export async function GET(
  request: Request,
  { params }: { params: { playlist: string } }
) {
  const { userId } = auth();

  if (!userId) return new Response("Unauthorized", { status: 401 });

  try {
    const token = await getClerkOAuthToken();

    const spotifyUrl = `${process.env.BASE_SPOTIFY_URL}/playlists/${params.playlist}/tracks`;

    const spotifyResponse = await fetch(spotifyUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await spotifyResponse.json();

    return NextResponse.json([...data.items]);
  } catch (error) {
    return Response.json(error);
  }
}
