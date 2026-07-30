import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { auth } from "@clerk/nextjs/server";
import { buildTools } from "@/lib/agent/tools";
import { createGoogle } from "@ai-sdk/google";

const google = createGoogle({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  // TODO: rate-limit per userId here before spending tokens

  const { messages } = await req.json();

  const result = streamText({
    model: google("gemini-2.5-flash"),
    system:
      "You are PlaylistFox's assistant. You ONLY help with music playlists - discovering sources, creating subscriptions, adjusting sync settings. Politely refuse anything else. Confirm before creating or changing things.",
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: buildTools(userId),
  });

  return result.toUIMessageStreamResponse();
}
