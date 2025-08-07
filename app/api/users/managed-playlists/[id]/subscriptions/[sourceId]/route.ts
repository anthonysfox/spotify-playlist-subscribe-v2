import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import getClerkOAuthToken from "utils/clerk";
import prisma from "@/lib/prisma";
import { AuditLogger } from "@/lib/audit-logger";

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

    // 3. Execute transaction with proper authorization check
    const result = await prisma.$transaction(async (tx) => {
      // First, verify the subscription exists and user has permission
      const subscription = await tx.managedPlaylistSourceSubscription.findFirst(
        {
          where: {
            // Add authorization check - ensure user owns the managed playlist
            sourcePlaylist: {
              id: sourceId, // Assuming managedPlaylist has a userId field
            },
            managedPlaylist: {
              id,
              userId,
            },
          },
          select: {
            id: true,
            managedPlaylistId: true,
            sourcePlaylistId: true,
            managedPlaylist: {
              select: {
                id: true,
                name: true, // For better logging/response
              },
            },
          },
        }
      );

      if (!subscription) {
        // Don't reveal whether subscription doesn't exist or user lacks permission
        throw new Error("Subscription not found or access denied");
      }

      // Delete the subscription first
      await tx.managedPlaylistSourceSubscription.delete({
        where: { id: subscription.id },
      });

      // Check if source playlist has other subscriptions before deleting
      const sourcePlaylistSubscriptionCount =
        await tx.managedPlaylistSourceSubscription.count({
          where: { sourcePlaylistId: subscription.sourcePlaylistId },
        });

      if (sourcePlaylistSubscriptionCount === 0) {
        // Delete orphaned source playlist
        await tx.sourcePlaylist.delete({
          where: { id: subscription.sourcePlaylistId },
        });
      }

      // Check if managed playlist has other subscriptions before deleting
      const managedPlaylistSubscriptionCount =
        await tx.managedPlaylistSourceSubscription.count({
          where: { managedPlaylistId: subscription.managedPlaylistId },
        });

      if (managedPlaylistSubscriptionCount === 0) {
        // Delete orphaned managed playlist
        await tx.managedPlaylist.delete({
          where: { id: subscription.managedPlaylistId },
        });
      }

      await AuditLogger.logSubscriptionDeleted(
        subscription.managedPlaylistId,
        subscription.sourcePlaylistId,
        userId
      );

      return {
        deletedSubscriptionId: subscription.id,
        managedPlaylistId: subscription.managedPlaylistId,
        playlistName: subscription.managedPlaylist.name,
      };
    });

    // 4. Success response with more details
    return NextResponse.json(
      {
        success: true,
        message: "Unsubscribed successfully",
        data: {
          subscriptionId: result.deletedSubscriptionId,
          managedPlaylistId: result.managedPlaylistId,
          playlistName: result.playlistName,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    // 5. Improved error handling
    console.error("[DELETE /api/subscriptions/[id]] Error:", error);

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
