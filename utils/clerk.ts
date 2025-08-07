import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default async function getClerkOAuthToken(userId?: string | null) {
  let resolvedUserId: string | null = null;

  // Step 1: Resolve the user ID
  if (userId) {
    resolvedUserId = userId;
  } else {
    const authData = await auth();
    resolvedUserId = authData.userId;
  }

  // Step 2: Validate user ID exists
  if (!resolvedUserId) {
    throw new Error("Unauthorized: No user ID provided or found in auth context");
  }

  const provider = "spotify";

  try {
    const client = await clerkClient();
    const clerkResponse = await client.users.getUserOauthAccessToken(
      resolvedUserId,
      provider
    );

    if (!clerkResponse?.data?.length) {
      throw new Error(`No ${provider} OAuth token found for user ${resolvedUserId}`);
    }

    const token = clerkResponse.data[0].token;

    if (!token) {
      throw new Error(`Invalid ${provider} token for user ${resolvedUserId}`);
    }

    return { userId: resolvedUserId, token };
  } catch (error) {
    console.error(`Error fetching ${provider} OAuth token for user ${resolvedUserId}:`, error);
    
    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`Failed to retrieve ${provider} OAuth token: ${error.message}`);
    }
    throw new Error(`Failed to retrieve ${provider} OAuth token`);
  }
}
