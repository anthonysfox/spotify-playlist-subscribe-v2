import { NextResponse } from "next/server";
import getClerkOAuthToken from "utils/clerk";

export async function GET() {
  try {
    const { userId, token } = await getClerkOAuthToken();

    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Error getting Spotify token:", error);
    return new Response(JSON.stringify({ error: "Failed to get token" }), {
      status: 500,
    });
  }
}
