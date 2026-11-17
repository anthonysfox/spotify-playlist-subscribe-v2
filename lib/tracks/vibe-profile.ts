import { gateway, generateText, Output } from "ai";
import { z } from "zod";
import { sleep } from "utils/sleep";

const MIN_TRACK_TAGS = 1;
const MIN_ARTIST_TAGS = 3;

// Runs through the AI Gateway (AI_GATEWAY_API_KEY), like the assistant and
// cover art, so it's billed per token with no free-tier request cap.
const VIBE_PROFILE_MODEL =
  process.env.VIBE_PROFILE_MODEL ?? "google/gemini-3.1-flash-lite";

// Minimum gap between generate calls. 0 (no limit) on the gateway; set it to
// 4500 if this is ever pointed at Gemini's free tier (15 requests a minute).
const MIN_INTERVAL_MS = Number(process.env.VIBE_PROFILE_MIN_INTERVAL_MS ?? 0);

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
  await waitForSlot();
  const { output } = await generateText({
    model: gateway.languageModel(VIBE_PROFILE_MODEL),
    output: Output.object({ schema: VibeProfileSchema }),
    prompt: `You are describing how a song feels, for a mood-based music search index.

You do not know the song's title or artist. You only have tags that listeners applied on music sites. Base everything on these tags and the typical feel of the genres they name. Do not guess at specific songs or artists.

Track tags describe this specific song and are the strongest evidence. Artist tags describe the artist's catalog in general; use them for background, but when the two disagree, follow the track tags.

Track tags: ${trackTags.length ? trackTags.join(", ") : "none"}
Artist tags: ${artistTags.length ? artistTags.join(", ") : "none"}

Fill moods, genres and listeningContext every time. Fill texture, vocals and tempoFeel only when a tag supports them directly (for example "piano", "female vocalists", "instrumental", "slow"); otherwise leave them out. Use plain lowercase words, with no song titles, artist names or chart references.`,
  });

  // The model occasionally spills the schema's own field names into a list
  // (moods: ["calm", "genres", "texture"]). Drop them so they aren't embedded.
  const fieldNames = new Set(
    Object.keys(VibeProfileSchema.shape).map((k) => k.toLowerCase()),
  );
  const clean = (items: string[]) =>
    items.filter((item) => !fieldNames.has(item.toLowerCase()));

  return {
    ...output,
    moods: clean(output.moods),
    genres: clean(output.genres),
    listeningContext: clean(output.listeningContext),
  };
}

export function hasEnoughSignal(
  trackTags: string[],
  artistTags: string[],
): boolean {
  return (
    trackTags.length >= MIN_TRACK_TAGS || artistTags.length >= MIN_ARTIST_TAGS
  );
}

// Same slot pattern as the MusicBrainz and Last.fm clients: each caller
// reserves the next free slot before awaiting, so concurrent callers queue up.
let nextSlot = 0;

async function waitForSlot() {
  const now = Date.now();
  const start = Math.max(now, nextSlot);
  nextSlot = start + MIN_INTERVAL_MS;
  if (start > now) await sleep(start - now);
}
