import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { AuditLogger } from "@/lib/audit-logger";
import { addDays, setHours, setMinutes } from "date-fns";

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
    const {
      syncInterval,
      syncQuantityPerSource,
      syncMode,
      explicitContentFilter,
      trackAgeLimit,
      customDays,
      customTime,
    } = body;

    const managedPlaylist = await prisma.managedPlaylist.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!managedPlaylist) {
      throw new Error("Playlist not found or access denied");
    }

    const updateData: any = {
      syncInterval,
      syncQuantityPerSource,
    };

    // Advanced settings if any
    if (syncMode !== undefined) updateData.syncMode = syncMode;
    if (explicitContentFilter !== undefined)
      updateData.explicitContentFilter = explicitContentFilter;
    if (trackAgeLimit !== undefined) updateData.trackAgeLimit = trackAgeLimit;
    if (customDays !== undefined)
      updateData.customDays = JSON.stringify(customDays);
    if (customTime !== undefined) updateData.customTime = customTime;

    // Calc next sync time if frequency or custom schedule changed
    if (syncInterval) {
      updateData.nextSyncTime =
        syncInterval === "CUSTOM" && customDays && customTime
          ? calculateNextCustomRun(customDays, customTime)
          : calculateNextSyncTime(syncInterval);
    }

    const updatedPlaylist = await prisma.managedPlaylist.update({
      where: {
        userId,
        id,
      },
      data: updateData,
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

function calculateNextSyncTime(syncFrequency: string) {
  const now = new Date();

  switch (syncFrequency) {
    case "DAILY":
      return addDays(now, 1);
    case "WEEKLY":
      return addDays(now, 7);
    case "MONTHLY":
      return addDays(now, 30);
    default:
      return addDays(now, 7);
  }
}

function calculateNextCustomRun(days?: string[], time?: string) {
  if (!days || !time) return null;

  const [hours, minutes] = time.split(":").map(Number);
  const now = new Date();

  const dayMap: { [key: string]: number } = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const targetDays = days
    .map((day) => dayMap[day.toLowerCase()])
    .filter((day) => day !== undefined);

  if (!targetDays.length) return null;

  for (let i = 0; i < 7; i++) {
    const candidateDate = addDays(now, i);
    const dayOfWeek = candidateDate.getDay();

    if (targetDays.includes(dayOfWeek)) {
      let scheduledTime = setHours(setMinutes(candidateDate, minutes), hours);

      if (i == 0 && scheduledTime <= now) {
        continue;
      }

      return scheduledTime;
    }
  }

  const firstTargetDay = Math.min(...targetDays);
  const daysUntilTarget = (firstTargetDay + 7 - now.getDay()) % 7 || 7;
  return setHours(setMinutes(now, daysUntilTarget), hours);
}
