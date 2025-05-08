import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import getClerkOAuthToken from "utils/clerk";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const { userId } = auth();

  if (!userId) return new Response("Unauthorized", { status: 401 });

  try {
    const data = await request.json();

    const subscription = await prisma.subscription.create({
      data: { ...data, userId },
    });

    return NextResponse.json({ subscription });
  } catch (error) {
    return Response.json(error);
  }
}

export async function DELETE(request: Request) {
  const { userId } = auth();

  if (!userId) return new Response("Unauthorized", { status: 401 });

  try {
    const data = await request.json();

    const subscription = await prisma.subscription.deleteMany({});

    return NextResponse.json({ subscription });
  } catch (error) {
    return Response.json(error);
  }
}
