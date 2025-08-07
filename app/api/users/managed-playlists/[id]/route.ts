import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { AuditLogger } from "@/lib/audit-logger";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { id } = await params;
  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: "Valid subscription ID is required" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { syncInterval, syncQuantityPerSource } = body;

    const managedPlaylist = await prisma.managedPlaylist.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!managedPlaylist) {
      throw new Error("Playlist not found or access denied");
    }

    const updatedPlaylist = await prisma.managedPlaylist.update({
      where: {
        userId,
        id,
      },
      data: {
        syncInterval,
        syncQuantityPerSource,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Updated successfully",
        data: {
          managedPlaylist: updatedPlaylist,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    // 5. Improved error handling
    console.error("[UPDATE /api/subscriptions/[id]] Error:", error);

    // Handle specific error cases
    if (error instanceof Error) {
      if (
        error.message.includes("not found") ||
        error.message.includes("access denied")
      ) {
        return NextResponse.json(
          { error: "Subscription not found or access denied" },
          { status: 404 }
        );
      }

      // Prisma-specific errors
      if (error.message.includes("P2025")) {
        return NextResponse.json(
          { error: "Record to delete does not exist" },
          { status: 404 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      {
        error: "Failed to update",
        message:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : "Unknown error"
            : undefined,
      },
      { status: 500 }
    );
  }
}
