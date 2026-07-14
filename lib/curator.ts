import { createGoogle } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { PlaylistTrack } from "./track-filters";

// The app already ships GEMINI_API_KEY; the provider would otherwise look for
// GOOGLE_GENERATIVE_AI_API_KEY, so the existing key is wired in explicitly.
const google = createGoogle({ apiKey: process.env.GEMINI_API_KEY });

// Judging a few dozen track titles is a small job, and this runs on every sync
// of every playlist that has a vibe set — so use the cheapest fast model. It is
// comfortably inside Gemini's free tier.
const CURATOR_MODEL = process.env.CURATOR_MODEL ?? "gemini-3.1-flash-lite";

// Cap how much of a source playlist we show the model. Keeps token use (and
// latency) bounded on playlists with hundreds of tracks.
const MAX_CANDIDATES = 60;

/**
 * The model picks by *index*, never by Spotify ID. A 22-character base62 ID is
 * easy for a model to corrupt by a character and impossible to validate as
 * "close enough"; a small integer either lands in range or is thrown away.
 */
const SelectionSchema = z.object({
  keep: z
    .array(z.number().int())
    .describe(
      "The indices of the tracks that fit the vibe, best first. " +
        "Return only genuinely good fits — returning fewer is correct and expected.",
    ),
});

export function isCuratorConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Choose which of `candidates` belong on a playlist described by `vibePrompt`.
 *
 * Falls back to the engine's historical behaviour — the first `limit` tracks in
 * playlist order — if the model is unavailable, misbehaves, or isn't configured.
 * A sync silently getting worse is much better than a sync failing outright.
 */
export async function selectByVibe(
  vibePrompt: string,
  candidates: PlaylistTrack[],
  limit: number,
): Promise<PlaylistTrack[]> {
  const fallback = () => candidates.slice(0, limit);

  if (!isCuratorConfigured() || candidates.length === 0 || limit <= 0) {
    return fallback();
  }

  // Nothing to decide — everything fits anyway.
  if (candidates.length <= limit) return candidates;

  const shortlist = candidates.slice(0, MAX_CANDIDATES);

  const numbered = shortlist
    .map((track, index) => `${index}. ${track.name} — ${track.artists.join(", ")}`)
    .join("\n");

  try {
    const { output } = await generateText({
      model: google(CURATOR_MODEL),
      output: Output.object({ schema: SelectionSchema }),
      prompt:
        `A listener describes the playlist they want as:\n"${vibePrompt}"\n\n` +
        `Here are candidate tracks:\n\n${numbered}\n\n` +
        `Pick at most ${limit} that genuinely match what they asked for, best first. ` +
        `Judge by what you know of these songs and artists. If fewer than ${limit} ` +
        `genuinely fit, return fewer — do not pad the list. If none fit, return an ` +
        `empty list.`,
    });

    // Trust nothing: indices must be in range, unique, and capped at the limit.
    const seen = new Set<number>();
    const picked: PlaylistTrack[] = [];

    for (const index of output.keep) {
      if (index < 0 || index >= shortlist.length) continue;
      if (seen.has(index)) continue;

      seen.add(index);
      picked.push(shortlist[index]);

      if (picked.length >= limit) break;
    }

    // An empty result is a legitimate answer ("nothing here fits the vibe"),
    // so it is respected rather than treated as a failure.
    return picked;
  } catch (error: any) {
    console.warn(
      `⚠️ Vibe selection failed (${error.message}); falling back to playlist order`,
    );
    return fallback();
  }
}
