import { NextResponse, type NextRequest } from "next/server";
import getClerkOAuthToken from "utils/clerk";

export async function GET(request: NextRequest) {
  const { userId, token } = await getClerkOAuthToken();

  if (!userId) return new Response("Unauthorized", { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const offset = searchParams.get("offset");
  const limit = searchParams.get("limit");
  try {
    const spotifyUrl = `${process.env.BASE_SPOTIFY_URL}/me/top/artists?offset=${
      offset || 0
    }&limit=${limit || 20}`;

    const spotifyResponse = await fetch(spotifyUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await spotifyResponse.json();

    const artists = data.items.reduce((artists, nextItem) => {
      artists.push(nextItem.name);

      return artists;
    }, []);

    return NextResponse.json([...artists]);
  } catch (error) {
    return Response.json(error);
  }
}
