import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import getClerkOAuthToken from "utils/clerk";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) return new Response("Unauthorized", { status: 401 });

  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
    });
    return NextResponse.json([...subscriptions]);
  } catch (error) {
    return Response.json(error);
  }
}
