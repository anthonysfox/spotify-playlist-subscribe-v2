import { createGoogle } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";

const MIN_TRACK_TAGS = 1;
const MIN_ARTIST_TAGS = 3;

const google = createGoogle({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const VIBE_PROFILE_MODEL =
  process.env.VIBE_PROFILE_MODEL ?? "gemini-3.1-flash-lite";

export const VibeProfileSchema = z.object({
  moods: z
    .array(z.string())
    .describe(
      "3–6 mood or atmosphere adjectives, inferred from the tags and the typical feel of those genres, e.g. nocturnal, melancholic, warm",
    ),
  genres: z
    .array(z.string())
    .describe(
      "Genres the song belongs to, e.g. pop, rock, indie. prefer specific subgenres over broad ones",
    ),
  texture: z
    .string()
    .optional()
    .describe(
      "Instruments and production feel, ONLY if the tags indicate it. e.g. piano, acoustic, synth, guitar",
    ),
  vocals: z
    .string()
    .optional()
    .describe(
      "e.g. instrumental, female vocals, male vocals, rap ONLY if the tags indicate it",
    ),
  tempoFeel: z
    .string()
    .optional()
    .describe("e.g. slow, unhurried. ONLY if the tags indicate it"),
  listeningContext: z
    .array(z.string())
    .describe(
      "2–4 settings it suits, e.g. late-night drive, studying, rainy afternoon",
    ),
});

export type VibeProfile = z.infer<typeof VibeProfileSchema>;

export function formatVibeProfile(p: VibeProfile): string {
  const lines: [string, string | undefined][] = [
    ["Moods", p.moods.join(", ")],
    ["Genres", p.genres.join(", ")],
    ["Texture", p.texture],
    ["Vocals", p.vocals],
    ["Tempo feel", p.tempoFeel],
    ["Listening context", p.listeningContext.join(", ")],
  ];

  return lines
    .filter(([, value]) => value?.trim())
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
}

export async function generateVibeProfile(
  trackTags: string[],
  artistTags: string[],
): Promise<VibeProfile> {
  const { output } = await generateText({
    model: google(VIBE_PROFILE_MODEL),
    output: Output.object({ schema: VibeProfileSchema }),
    prompt: `You are describing how a song feels, for a mood-based music search index.

You do not know the song's title or artist. You only have tags that listeners applied on music sites. Base everything on these tags and the typical feel of the genres they name. Do not guess at specific songs or artists.

Track tags describe this specific song and are the strongest evidence. Artist tags describe the artist's catalog in general; use them for background, but when the two disagree, follow the track tags.

Track tags: ${trackTags.length ? trackTags.join(", ") : "none"}
Artist tags: ${artistTags.length ? artistTags.join(", ") : "none"}

Fill moods, genres and listeningContext every time. Fill texture, vocals and tempoFeel only when a tag supports them directly (for example "piano", "female vocalists", "instrumental", "slow"); otherwise leave them out. Use plain lowercase words, with no song titles, artist names or chart references.`,
  });

  return output;
}

export function hasEnoughSignal(
  trackTags: string[],
  artistTags: string[],
): boolean {
  return (
    trackTags.length >= MIN_TRACK_TAGS || artistTags.length >= MIN_ARTIST_TAGS
  );
}
