import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { auth } from "@clerk/nextjs/server";
import { buildTools } from "@/lib/agent/tools";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { messages } = await req.json();

  const result = streamText({
    // Bare "provider/model" routes through the Vercel AI Gateway (funded balance,
    // paid-tier limits) rather than a free-tier key that 429s after a couple of
    // multi-step turns. Swap the string to change model/provider.
    model: "google/gemini-2.5-flash",
    system:
      "You are PlaylistFox's assistant. You ONLY help with music playlists - discovering sources, creating subscriptions, adjusting sync settings. Politely refuse anything else. Confirm before creating or changing things. " +
      "When a user asks to add more music from specific artists into one of their playlists (e.g. 'add more John Mayer to my Chill playlist'), use addArtistsToPlaylist rather than createSubscription — it resolves each artist to the right source playlist automatically. If the destination playlist isn't clear, call listManagedPlaylists first and ask which one.",
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: buildTools(userId),
  });

  return result.toUIMessageStreamResponse();
}
