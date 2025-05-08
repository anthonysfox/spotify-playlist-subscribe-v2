import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import getClerkOAuthToken from "../../../../../utils/clerk";

export async function POST(request: Request) {
  const { userId } = auth();

  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const track = searchParams.get("track") || "";
  const deviceID = searchParams.get("device_id") || "";
  try {
    const token = await getClerkOAuthToken();

    const spotifyUrl = `${
      process.env.BASE_SPOTIFY_URL
    }/me/player/queue?uri=${encodeURIComponent(
      track
    )}&device_id=${encodeURIComponent(deviceID)}`;

    console.log(deviceID);

    const spotifyResponse = await fetch(spotifyUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await spotifyResponse.json();

    return NextResponse.json({ data });
  } catch (error) {
    return Response.json(error);
  }
}
