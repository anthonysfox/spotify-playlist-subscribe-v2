import { NextResponse } from "next/server";
import getClerkOAuthToken from "utils/clerk";

export async function PUT(req: Request) {
  const { trackId, deviceId } = await req.json();
  const { userId, token } = await getClerkOAuthToken();

  if (!userId || !token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      uris: [`spotify:track:${trackId}`],
    }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    return NextResponse.json(errorData, { status: res.status });
  }

  return NextResponse.json({ success: true });
}
