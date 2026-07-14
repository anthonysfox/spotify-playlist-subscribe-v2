import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { getDeveloperToken } from "@/lib/music/apple";

/**
 * A Music User Token lasts about six months and cannot be renewed server-side.
 * Re-minting it well before then — on any ordinary visit, while the user is
 * already here — is what stops a background sync from silently rotting. Five
 * months leaves a month of slack.
 */
const REFRESH_AFTER_DAYS = 150;

/**
 * Hand the browser a developer token so MusicKit JS can authorise the user, plus
 * enough state for it to decide whether it needs to act.
 *
 * The .p8 private key stays on the server; only this short-lived signed JWT is
 * ever exposed. Auth-gated so it isn't a free token faucet.
 */
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const developerToken = await getDeveloperToken();

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { appleMusicUserToken: true, appleMusicTokenIssuedAt: true },
    });

    const connected = Boolean(user?.appleMusicUserToken);
    const issuedAt = user?.appleMusicTokenIssuedAt ?? null;

    const ageInDays = issuedAt
      ? (Date.now() - issuedAt.getTime()) / 86_400_000
      : null;

    return NextResponse.json({
      developerToken,
      connected,
      issuedAt,
      // The client silently re-authorises when this is true, so the token is
      // replaced long before a sync ever finds it dead.
      needsRefresh:
        connected && (ageInDays === null || ageInDays > REFRESH_AFTER_DAYS),
    });
  } catch (error: any) {
    // Almost always means the APPLE_MUSIC_* env vars aren't set.
    console.error("Failed to mint Apple Music developer token:", error.message);

    return NextResponse.json(
      { error: "Apple Music is not configured" },
      { status: 503 },
    );
  }
}

/**
 * Store the Music User Token that MusicKit JS just minted in the browser.
 *
 * This is the whole reason Apple Music needs a front end at all: the token can
 * only be created client-side, it can't be refreshed server-side, and it lapses
 * after ~6 months. `appleMusicTokenIssuedAt` is recorded so the app can quietly
 * re-mint it on an ordinary visit *before* it expires, rather than letting a
 * background sync discover it's dead.
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const { musicUserToken } = await request.json();

    if (!musicUserToken || typeof musicUserToken !== "string") {
      return NextResponse.json(
        { error: "musicUserToken is required" },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: { clerkUserId: userId },
      data: {
        appleMusicUserToken: musicUserToken,
        appleMusicTokenIssuedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to store Apple Music user token:", error.message);

    return NextResponse.json(
      { error: "Failed to store Apple Music token" },
      { status: 500 },
    );
  }
}

/** Disconnect Apple Music. */
export async function DELETE() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  await prisma.user.update({
    where: { clerkUserId: userId },
    data: { appleMusicUserToken: null, appleMusicTokenIssuedAt: null },
  });

  return NextResponse.json({ success: true });
}
