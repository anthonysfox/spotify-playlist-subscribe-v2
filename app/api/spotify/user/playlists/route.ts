import { NextResponse, type NextRequest } from "next/server";
import getClerkOAuthToken from "utils/clerk";

export async function GET(request: NextRequest) {
  const { userId, token, spotifyUserId } = await getClerkOAuthToken();

  if (!userId) return new Response("Unauthorized", { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const offset = searchParams.get("offset");
  const limit = searchParams.get("limit");
  const ownedOnly = searchParams.get("owned_only");
  try {
    const spotifyUrl = `${process.env.BASE_SPOTIFY_URL}/me/playlists?offset=${
      offset || 0
    }&limit=${limit || 20}`;

    const spotifyResponse = await fetch(spotifyUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await spotifyResponse.json();

    if (ownedOnly) {
      console.log(data.items[0].owner, spotifyUserId);

      return NextResponse.json([
        ...data.items.filter(
          (playlist: any) => playlist.owner.id === spotifyUserId
        ),
      ]);
    }

    return NextResponse.json([...data.items]);
  } catch (error) {
    console.log(error);
    return Response.json(error);
  }
}
