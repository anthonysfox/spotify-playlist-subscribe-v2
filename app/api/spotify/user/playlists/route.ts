import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import getClerkOAuthToken from "utils/clerk";

export async function GET(request: NextRequest) {
  const { userId } = auth();

  if (!userId) return new Response("Unauthorized", { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const offset = searchParams.get("offset");
  const limit = searchParams.get("limit");
  try {
    const token = await getClerkOAuthToken();

    const spotifyUrl = `${process.env.BASE_SPOTIFY_URL}/me/playlists?offset=${
      offset || 0
    }&limit=${limit || 20}`;

    const spotifyResponse = await fetch(spotifyUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await spotifyResponse.json();

    return NextResponse.json([...data.items]);
  } catch (error) {
    console.log(error);
    return Response.json(error);
  }
}
