import { NextResponse } from "next/server";
import getClerkOAuthToken from "utils/clerk";

export async function GET() {
  const { userId, token } = await getClerkOAuthToken();

  if (!userId) return new Response("Unauthorized", { status: 401 });

  const spotifyUrl = `${process.env.BASE_SPOTIFY_URL}/me`;

  const spotifyResponse = await fetch(spotifyUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await spotifyResponse.json();

  return NextResponse.json({ data });
}
