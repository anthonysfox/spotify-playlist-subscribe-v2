import { NextResponse } from "next/server";
import getClerkOAuthToken from "utils/clerk";

export async function POST(req: Request) {
  const { trackId, playImmediately = false, deviceId } = await req.json();
  const { userId, token } = await getClerkOAuthToken();

  if (!userId || !token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // If deviceId is provided, transfer playback to the browser device
    if (deviceId) {
      const transferRes = await fetch(`${process.env.BASE_SPOTIFY_URL}/me/player`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_ids: [deviceId],
          play: false,
        }),
      });

      if (!transferRes.ok) {
        console.log("Failed to transfer playback to browser device");
      } else {
        // Wait a moment for transfer to complete
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Add track to user's queue
    const queueRes = await fetch(`${process.env.BASE_SPOTIFY_URL}/me/player/queue?uri=spotify:track:${trackId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!queueRes.ok) {
      const errorData = await queueRes.json();
      console.error("Spotify queue API error:", errorData);
      return NextResponse.json(errorData, { status: queueRes.status });
    }

    // If playImmediately is true, skip to next track and seek to 30 seconds
    if (playImmediately) {
      const skipRes = await fetch(`${process.env.BASE_SPOTIFY_URL}/me/player/next`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!skipRes.ok) {
        console.error("Failed to skip to next track, but track was added to queue");
        // Still return success since track was added to queue
      } else {
        // Wait a moment for the skip to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Seek to 30 seconds
        const seekRes = await fetch(`${process.env.BASE_SPOTIFY_URL}/me/player/seek?position_ms=30000`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!seekRes.ok) {
          console.error("Failed to seek to 30 seconds");
        } else {
          // Wait a moment for seek to complete, then start playback
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const playRes = await fetch(`${process.env.BASE_SPOTIFY_URL}/me/player/play`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (!playRes.ok) {
            console.error("Failed to start playback after seek");
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: playImmediately ? "Track added to queue and playing" : "Track added to queue" 
    });
  } catch (error) {
    console.error("Error adding track to queue:", error);
    return NextResponse.json({ error: "Failed to add track to queue" }, { status: 500 });
  }
}