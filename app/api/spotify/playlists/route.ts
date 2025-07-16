import { NextResponse } from "next/server";
import getClerkOAuthToken from "utils/clerk";
import { OFFSET } from "utils/constants";

export async function GET(request: Request) {
  const { userId, token } = await getClerkOAuthToken();

  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const artistsParam = searchParams.get("artists");
  const offset = searchParams.get("offset") || 0;

  if (!artistsParam) {
    return new Response("Missing artists parameter", { status: 400 });
  }

  const artists = artistsParam.split(","); // Split artists by comma
  if (!process.env.BASE_SPOTIFY_URL) {
    return new Response("Missing BASE_SPOTIFY_URL environment variable", {
      status: 500,
    });
  }

  try {
    // Concurrently fetch playlists for all artists
    const playlistPromises = artists.map((artist) => {
      const spotifyUrl = `${process.env.BASE_SPOTIFY_URL}/search?q=${artist}&type=playlist&limit=${OFFSET}&offset=${offset}`;
      return fetch(spotifyUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch playlists for artist: ${artist}`);
        }
        return res.json();
      });
    });

    const responses = await Promise.allSettled(playlistPromises);

    // Extract successful responses and flatten playlist items
    const playlists = responses
      .filter((response) => response.status === "fulfilled")
      .flatMap((response) => response.value.playlists?.items || []);

    return NextResponse.json(playlists);
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
