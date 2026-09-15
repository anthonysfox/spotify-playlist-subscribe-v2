import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { subscribe, SubscribeError } from "@/lib/subscribe";

const playlistRef = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  imageUrl: z.string().nullable().optional(),
  trackCount: z.number().int().nonnegative(),
});

/**
 * Exactly the fields a client is allowed to set — which pointedly does NOT
 * include `userId`. That comes from the Clerk session and nowhere else; parsing
 * through this schema is what guarantees a caller can't smuggle one in and have
 * `subscribe()` act as another user against *their* music-service tokens.
 */
const subscribeBody = z.object({
  provider: z.enum(["SPOTIFY", "APPLE_MUSIC"]).optional(),
  sourcePlaylist: playlistRef,
  managedPlaylist: playlistRef.optional(),
  newPlaylistName: z.string().min(1).optional(),
  syncFrequency: z.string().optional(),
  runImmediateSync: z.boolean().optional(),
  syncQuantityPerSource: z.number().int().positive().optional(),
  syncMode: z.string().optional(),
  explicitContentFilter: z.boolean().optional(),
  trackAgeLimit: z.number().int().nonnegative().optional(),
  vibePrompt: z.string().optional(),
  customDays: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  // Transport concern #1: authenticate. The service takes userId as a param, so
  // this is the only place the HTTP request's identity is resolved.
  const { userId } = await auth();

  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Transport concern #2: parse and validate the input.
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = subscribeBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    // `userId` comes last so the session identity wins no matter what — the
    // schema already drops any client-supplied one, but spreading a
    // request-derived object over the authenticated user is the bug worth
    // making structurally impossible rather than merely unlikely.
    const result = await subscribe({ ...parsed.data, userId });

    return NextResponse.json(
      {
        message: "Subscription created successfully",
        success: true,
        data: {
          managedPlaylist: result.managedPlaylist,
          subscriptionId: result.subscriptionId,
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    // Transport concern #3: translate domain failures into HTTP. A SubscribeError
    // carries the right status; anything else is an unexpected 500.
    if (error instanceof SubscribeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Error handling subscribe request:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}
