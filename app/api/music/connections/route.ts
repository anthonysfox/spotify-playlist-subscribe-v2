import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getConnectionsForUser } from "@/lib/connections";

/**
 * Which music services this user has actually connected. Thin wrapper around
 * `getConnectionsForUser` — server components call that directly.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  return NextResponse.json({ connections: await getConnectionsForUser(userId) });
}
