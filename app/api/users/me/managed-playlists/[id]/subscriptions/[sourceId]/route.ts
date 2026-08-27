import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { unsubscribe, UnsubscribeError } from "@/lib/unsubscribe";

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; sourceId: string }>;
  }
) {
  try {
    // 1. Authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // 2. Parameter validation
    const { id, sourceId } = await params;
    if (!sourceId || typeof sourceId !== "string") {
      return NextResponse.json(
        { error: "Valid subscription ID is required" },
        { status: 400 }
      );
    }

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Valid managed playlist ID is required" },
        { status: 400 }
      );
    }

    // 3. Domain logic — shared with the chat tool (lib/agent/tools.ts)
    const result = await unsubscribe({
      userId,
      managedPlaylistId: id,
      sourcePlaylistId: sourceId,
    });

    // 4. Success response
    return NextResponse.json(
      {
        success: true,
        message: "Unsubscribed successfully",
        data: {
          managedPlaylistId: result.managedPlaylistId,
          playlistName: result.playlistName,
          managedPlaylistDeleted: result.managedPlaylistDeleted,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[DELETE /api/subscriptions/[id]] Error:", error);

    if (error instanceof UnsubscribeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    // Generic error response
    return NextResponse.json(
      {
        error: "Failed to unsubscribe",
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
