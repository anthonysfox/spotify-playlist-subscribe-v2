import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { clerkClient } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req);

    // Do something with the payload
    // For this guide, you simply log the payload to the console
    const { id, first_name, last_name, image_url, email_addresses } =
      evt.data as {
        id?: string;
        first_name?: string;
        last_name?: string;
        image_url?: string;
        email_addresses?: Array<{ email_address: string }>;
      };
    const eventType = evt.type;

    if (eventType === "user.created" && id) {
      const client = await clerkClient();
      const test = await client.users.getUser(id);
      const spotifyToken = clerkUser.externalAccounts.find(
        (account) => account.provider === "spotify"
      )?.accessToken;

      if (spotifyToken) {
        const isPremium = await checkSpotifyPremium(spotifyToken);

        if (!isPremium) {
          // Delete immediately if not premium
          await clerkClient.users.deleteUser(id);

          return NextResponse.json(
            { error: "Premium required" },
            { status: 403 }
          );
        }
      }

      const createdUser = await prisma.user.create({
        data: {
          clerkUserId: id,
          email: email_addresses?.[0]?.email_address || "",
          name: `${first_name} ${last_name}`,
          imageUrl: image_url,
        },
      });

      return NextResponse.json({ user: createdUser }, { status: 200 });
    } else if (eventType === "user.updated") {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(id);
      const spotifyAccount = clerkUser.externalAccounts;
      console.log(spotifyAccount);

      const updatedUser = await prisma.user.update({
        where: {
          clerkUserId: id,
        },
        data: {
          imageUrl: image_url,
        },
      });
      return NextResponse.json({ user: updatedUser }, { status: 200 });
    } else if (evt.type === "user.deleted") {
      await prisma.user.delete({
        where: {
          clerkUserId: id,
        },
      });
    }
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }
}

async function checkSpotifyPremium(token: string): Promise<boolean> {
  const response = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) return false;

  const userData = await response.json();
  return userData.product === "premium";
}
