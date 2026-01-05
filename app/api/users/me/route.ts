import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  let body: { timezone?: string } | undefined;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const timezone = body?.timezone?.trim();
  if (!timezone) {
    return NextResponse.json(
      { error: "Timezone is required" },
      { status: 400 }
    );
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { clerkUserId: userId },
      data: { timezone },
      select: { clerkUserId: true, timezone: true },
    });

    return NextResponse.json(
      { success: true, data: { user: updatedUser } },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PATCH /api/users/me] Error:", error);
    return NextResponse.json(
      { error: "Failed to update user timezone" },
      { status: 500 }
    );
  }
}
