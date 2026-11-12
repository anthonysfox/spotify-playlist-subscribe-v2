import { z } from "zod";

const MIN_TRACK_TAGS = 1;
const MIN_ARTIST_TAGS = 3;

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

export function hasEnoughSignal(
  trackTags: string[],
  artistTags: string[],
): boolean {
  return (
    trackTags.length >= MIN_TRACK_TAGS || artistTags.length >= MIN_ARTIST_TAGS
  );
}
