import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const evt = await verifyWebhook(req);

    // Do something with the payload
    // For this guide, you simply log the payload to the console
    const { id, first_name, last_name, image_url, email_addresses } = evt.data;
    const eventType = evt.type;

    console.log("here");
    if (eventType === "user.created" && id) {
      console.log("created");
      const createdUser = await prisma.user.create({
        data: {
          clerkUserId: id,
          email: email_addresses[0].email_address,
          name: `${first_name} ${last_name}`,
          imageUrl: image_url,
        },
      });

      return NextResponse.json({ user: createdUser }, { status: 200 });
    } else if (eventType === "user.updated") {
      console.log("updated");
      const updatedUser = await prisma.user.update({
        where: {
          clerkUserId: id,
        },
        data: {
          imageUrl: image_url,
        },
      });
      return NextResponse.json({ user: updatedUser }, { status: 200 });
    }
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }
}
