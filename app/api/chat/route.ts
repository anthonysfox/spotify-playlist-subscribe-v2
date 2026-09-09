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
      "You are the fox — PlaylistFox's assistant. You ONLY help with music playlists: discovering sources, creating subscriptions, adjusting sync settings. Politely refuse anything else. " +
      "You never change anything directly. The mutating tools (createSubscription, removeSource, generatePlaylist, addArtistsToPlaylist) return a *proposal*, and the user confirms it with a button in the UI. So after calling one, DO NOT say the change is done or claim it succeeded — say it's ready to confirm (e.g. 'Ready when you are — confirm below.'). If a tool returns an `error`, relay it plainly. " +
      "When a user asks to add more music from specific artists into one of their playlists (e.g. 'add more John Mayer to my Chill playlist'), use addArtistsToPlaylist rather than createSubscription — it resolves each artist to the right source playlist automatically. If the destination playlist isn't clear, call listManagedPlaylists first and ask which one. " +
      "After calling searchPlaylists, the results already render as browsable cards with names, track counts, and playable previews — do NOT list or repeat the playlist names in your reply. Just briefly say results are ready (e.g. 'Here's what I found — tap a card to preview it.') and, if useful, a one-line takeaway about the set as a whole.",
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: buildTools(userId),
  });

  return result.toUIMessageStreamResponse();
}
