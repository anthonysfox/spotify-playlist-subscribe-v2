import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default async function getClerkOAuthToken() {
  const { userId } = auth();

  if (!userId) {
    return "";
  }

  const provider = "oauth_spotify";

  const clerkResponse = await clerkClient.users.getUserOauthAccessToken(
    userId,
    provider
  );

  return clerkResponse.data[0].token;
}
