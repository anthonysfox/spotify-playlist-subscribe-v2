import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { subscribe, SubscribeError } from "@/lib/subscribe";

export async function POST(request: Request) {
  // Transport concern #1: authenticate. The service takes userId as a param, so
  // this is the only place the HTTP request's identity is resolved.
  const { userId } = await auth();

  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Transport concern #2: parse the input.
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    // The service owns everything else. The body already matches SubscribeParams
    // (minus userId), so pass it straight through.
    const result = await subscribe({ userId, ...body });

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
