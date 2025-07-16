import { NextResponse } from "next/server";
import getClerkOAuthToken from "utils/clerk";

export async function PUT(request: Request) {
  const { userId, token } = await getClerkOAuthToken();

  if (!userId) return new Response("Unauthorized", { status: 401 });

  try {
    const body = await request.json();
    const { uris, position_ms, device_id } = body;

    const spotifyUrl = `${process.env.BASE_SPOTIFY_URL}/me/player/play?device_id=${device_id}`;

    const spotifyResponse = await fetch(spotifyUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uris: uris,
        position_ms: position_ms || 0,
      }),
    });

    if (!spotifyResponse.ok) {
      const errorData = await spotifyResponse.json();
      console.error("Spotify API error:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to start playback" }),
        {
          status: spotifyResponse.status,
        }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error starting playback:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
}
