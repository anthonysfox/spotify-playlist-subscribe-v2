import { NextRequest, NextResponse } from "next/server";
import getClerkOAuthToken from "utils/clerk";

type Params = Promise<{ playlist: string }>;

export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  const { userId, token } = await getClerkOAuthToken();
  const params = await segmentData.params;
  const { searchParams } = new URL(request.url);

  if (!userId) return new Response("Unauthorized", { status: 401 });

  try {
    const playlistId: string = params.playlist;
    const response: any = {};

    const includeTracks: boolean = searchParams.get("tracks") === "true";
    const includeMetadata: boolean = searchParams.get("metadata") === "true";

    const fields: string[] = [];
    if (includeTracks) {
      fields.push(
        "tracks.items(track(id,name,album,duration_ms,artists(name)))"
      );
    }

    if (includeMetadata) {
      fields.push(
        "id",
        "name",
        "description",
        "images",
        "owner(id,display_name)",
        "tracks.total"
      );
    }

    const spotifyUrl = `${
      process.env.BASE_SPOTIFY_URL
    }/playlists/${playlistId}?${
      fields.length ? `fields=${fields.join(",")}` : ""
    }`;

    const spotifyResponse = await fetch(spotifyUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await spotifyResponse.json();

    if (fields.length) {
      if (includeMetadata) {
        response.playlist = {
          id: data.id,
          name: data.name,
          description: data.description,
          images: data.images,
          owner: {
            id: data.owner.id,
            display_name: data.owner.display_name,
          },
        };
        response.track_count = data.tracks.total;
      }

      if (includeTracks) {
        response.tracks = data.tracks?.items || [];
      }
    } else {
      const spotifyUrl = `${process.env.BASE_SPOTIFY_URL}/playlists/${playlistId}?fields=tracks.total`;

      const spotifyResponse = await fetch(spotifyUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await spotifyResponse.json();
      response.trackCount = data.tracks.total;
    }

    return NextResponse.json(response);
  } catch (error) {
    return Response.json(error);
  }
}
