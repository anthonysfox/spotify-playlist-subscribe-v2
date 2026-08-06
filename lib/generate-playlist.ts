import { generateObject } from "ai";
import { z } from "zod";
import type { MusicClient } from "@/lib/music/types";

// Runs through the Vercel AI Gateway (funded balance). Flash knows real songs
// well and is cheap; override per env if you want a stronger model.
const MODEL = process.env.GENERATE_PLAYLIST_MODEL ?? "google/gemini-2.5-flash";

export interface TrackSuggestion {
  title: string;
  artist: string;
}

const TracklistSchema = z.object({
  tracks: z.array(z.object({ title: z.string(), artist: z.string() })),
});

/**
 * Ask the model for a tracklist that captures a vibe. Real songs only — the
 * suggestions are resolved against the provider's catalog afterwards, and
 * anything invented simply won't resolve.
 */
export async function generateTracklist(
  vibe: string,
  count: number,
): Promise<TrackSuggestion[]> {
  const { object } = await generateObject({
    model: MODEL,
    schema: TracklistSchema,
    prompt:
      `Build a playlist that captures this vibe:\n"${vibe}"\n\n` +
      `Suggest ${count} songs. Rules:\n` +
      `- Only real, existing songs by real artists — never invent titles.\n` +
      `- Vary the artists; don't lean on one over and over.\n` +
      `- Give the exact track title and the primary artist for each.`,
  });

  return object.tracks.slice(0, count);
}

/**
 * Resolve suggested "Title / Artist" pairs into real provider track ids via
 * search. Skips anything that doesn't resolve (models hallucinate) and de-dupes,
 * so the result is a clean list ready for `addTracks`.
 *
 * Sequential on purpose — providers rate-limit, and a vibe playlist is a
 * one-shot action where a few extra seconds is fine.
 */
export async function resolveTracks(
  client: MusicClient,
  suggestions: TrackSuggestion[],
): Promise<string[]> {
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const suggestion of suggestions) {
    const results = await client.searchTracks(
      `${suggestion.title} ${suggestion.artist}`,
      1,
    );
    const hit = results[0];
    if (hit && !seen.has(hit.id)) {
      seen.add(hit.id);
      ids.push(hit.id);
    }
  }

  return ids;
}
