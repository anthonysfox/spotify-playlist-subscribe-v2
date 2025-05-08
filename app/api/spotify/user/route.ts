import { NextResponse } from "next/server";
import getClerkOAuthToken from "utils/clerk";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = auth();

  if (!userId) return new Response("Unauthorized", { status: 401 });

  const token = await getClerkOAuthToken();

  const spotifyUrl = `${process.env.BASE_SPOTIFY_URL}/me`;

  const spotifyResponse = await fetch(spotifyUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await spotifyResponse.json();

  return NextResponse.json({ data });
}
