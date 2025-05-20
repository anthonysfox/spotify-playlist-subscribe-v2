import { NextResponse } from "next/server";
import getClerkOAuthToken from "utils/clerk";

type Params = Promise<{ playlist: string }>;

export async function GET(request: Request, segmentData: { params: Params }) {
  const { userId, token } = await getClerkOAuthToken();
  const params = await segmentData.params;

  if (!userId) return new Response("Unauthorized", { status: 401 });

  try {
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
