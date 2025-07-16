import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default async function getClerkOAuthToken() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const provider = "spotify";

  try {
    const client = await clerkClient();
    const clerkResponse = await client.users.getUserOauthAccessToken(
      userId,
      provider
    );

    if (!clerkResponse?.data?.length) {
      throw new Error("No OAuth token found for the user");
    }

    const token = clerkResponse.data[0].token;

    return { userId, token };
  } catch (error) {
    console.error("Error fetching OAuth token:", error);
    throw new Error("Failed to retrieve OAuth token");
  }
}
