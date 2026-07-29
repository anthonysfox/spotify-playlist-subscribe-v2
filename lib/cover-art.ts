import { generateText, gateway } from "ai";
import sharp from "sharp";
import type { PlaylistTrack } from "./track-filters";

// Both steps run through Google via the Vercel AI Gateway, so one
// AI_GATEWAY_API_KEY covers the whole feature. The art-direction step turns a
// track list into an image prompt — a small job, so a cheap fast text model.
const PROMPT_MODEL = process.env.COVER_ART_PROMPT_MODEL ?? "google/gemini-2.5-flash";

// "Nano Banana" — Gemini's image model. Unlike a dedicated text-to-image model,
// it generates images through the *language* API and returns them as files on
// the generateText result. Swappable via one env var.
const IMAGE_MODEL =
  process.env.COVER_ART_IMAGE_MODEL ?? "google/gemini-2.5-flash-image";

// Enough tracks to establish a vibe without spending tokens on a 500-track list.
const MAX_TRACKS = 50;

// Spotify caps the *base64* cover payload at 256 KB, and base64 inflates the
// raw bytes by ~33%. So the JPEG itself must stay under ~192 KB — target 180 KB
// for margin (180 KB → ~240 KB base64).
const MAX_BYTES = 180 * 1024;

// PlaylistFox's brand identity, its burnt-orange accent. Every cover carries a
// fox motif so the whole set reads as one brand regardless of the music's mood.
const BRAND_ACCENT = "#CC5500";

// Appended verbatim to the final image prompt. Kept separate from the art
// director's creative prompt so the fox and brand colour are guaranteed on every
// image even if the text model underplays them.
const BRAND_DIRECTIVE =
  `Non-negotiable brand requirements: feature a single stylized fox as a ` +
  `natural focal element of the scene, rendered in the same art style as the ` +
  `rest of the image (not a sticker or logo pasted on top). Work a warm ` +
  `burnt-orange accent (${BRAND_ACCENT}) into the palette. Absolutely no text, ` +
  `letters, words, numbers, watermarks or logos anywhere in the image.`;

export interface CoverArtResult {
  /** Raw base64 of a JPEG (no `data:` prefix) — ready for Spotify's upload API. */
  jpegBase64: string;
  /** The art-direction prompt that produced it, for display / regeneration. */
  prompt: string;
}

/**
 * Both steps run through the gateway, so a single key configures the feature.
 * Callers check this to hide the feature instead of surfacing a runtime failure.
 */
export function isCoverArtConfigured(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY);
}

function summariseTracks(tracks: PlaylistTrack[]): string {
  return tracks
    .slice(0, MAX_TRACKS)
    .map((track) => `${track.name} — ${track.artists.join(", ")}`)
    .join("\n");
}

/** Ask the model to read the room and write a single vivid image prompt. */
async function buildArtDirection(
  playlistName: string,
  tracks: PlaylistTrack[],
  vibePrompt?: string | null,
): Promise<string> {
  console.log(
    `You are an art director creating cover art for a music playlist.\n\n` +
      `Playlist name: "${playlistName}"\n` +
      (vibePrompt?.trim()
        ? `The owner describes the vibe as: "${vibePrompt.trim()}"\n`
        : "") +
      `\nTracks:\n${summariseTracks(tracks)}\n\n` +
      `Infer the overall mood, genre, era and energy of this music, then write a ` +
      `single vivid image-generation prompt (2–4 sentences) for a square cover. ` +
      `Describe subject, art style, colour palette, lighting and composition. ` +
      `This is cover art for "PlaylistFox", so build the scene around a single ` +
      `stylized fox as its focal character, posed or placed to fit the music's ` +
      `mood, and let a warm burnt-orange (${BRAND_ACCENT}) run through the ` +
      `palette. Keep it evocative and abstract enough to avoid any real artist's ` +
      `likeness or trademarked imagery. The image must contain NO text, letters, ` +
      `words or logos. Output only the prompt itself, nothing else.`,
  );
  const { text } = await generateText({
    model: gateway.languageModel(PROMPT_MODEL),
    prompt:
      `You are an art director creating cover art for a music playlist.\n\n` +
      `Playlist name: "${playlistName}"\n` +
      (vibePrompt?.trim()
        ? `The owner describes the vibe as: "${vibePrompt.trim()}"\n`
        : "") +
      `\nTracks:\n${summariseTracks(tracks)}\n\n` +
      `Infer the overall mood, genre, era and energy of this music, then write a ` +
      `single vivid image-generation prompt (2–4 sentences) for a square cover. ` +
      `Describe subject, art style, colour palette, lighting and composition. ` +
      `This is cover art for "PlaylistFox", so build the scene around a single ` +
      `stylized fox as its focal character, posed or placed to fit the music's ` +
      `mood, and let a warm burnt-orange (${BRAND_ACCENT}) run through the ` +
      `palette. Keep it evocative and abstract enough to avoid any real artist's ` +
      `likeness or trademarked imagery. The image must contain NO text, letters, ` +
      `words or logos. Output only the prompt itself, nothing else.`,
  });

  return text.trim();
}

/**
 * Render the prompt with Nano Banana. It's a language model that emits images,
 * so the picture comes back as a file on the result rather than from a dedicated
 * image endpoint. Ask for the image modality explicitly and grab the first one.
 */
async function renderCover(prompt: string): Promise<Uint8Array> {
  const { files } = await generateText({
    model: gateway.languageModel(IMAGE_MODEL),
    prompt,
    providerOptions: {
      google: { responseModalities: ["IMAGE"] },
    },
  });

  const image = files.find((file) => file.mediaType?.startsWith("image/"));
  if (!image) {
    throw new Error("The image model returned no image.");
  }

  return image.uint8Array;
}

/** Downscale and compress to a JPEG that fits Spotify's 256 KB cover limit. */
async function toSpotifyJpeg(bytes: Uint8Array): Promise<string> {
  // Spotify recommends ~640px covers. Step quality down until it fits, cloning
  // the resized pipeline each try so re-encoding doesn't compound.
  const resized = sharp(Buffer.from(bytes)).resize(640, 640, { fit: "cover" });

  for (const quality of [82, 72, 62, 52, 42]) {
    const out = await resized.clone().jpeg({ quality }).toBuffer();
    if (out.byteLength <= MAX_BYTES) return out.toString("base64");
  }

  // Extremely busy image: drop to a smaller canvas as a last resort.
  const small = await sharp(Buffer.from(bytes))
    .resize(400, 400, { fit: "cover" })
    .jpeg({ quality: 45 })
    .toBuffer();

  return small.toString("base64");
}

/**
 * Generate cover art for a playlist from its tracks. Does not upload anything —
 * the caller shows a preview and uploads on confirmation.
 */
export async function generatePlaylistCover(input: {
  playlistName: string;
  tracks: PlaylistTrack[];
  vibePrompt?: string | null;
}): Promise<CoverArtResult> {
  const artDirection = await buildArtDirection(
    input.playlistName,
    input.tracks,
    input.vibePrompt,
  );

  // The brand clause is appended deterministically, so the fox and accent don't
  // depend on the text model remembering the instruction.
  const prompt = `${artDirection}\n\n${BRAND_DIRECTIVE}`;

  const imageBytes = await renderCover(prompt);
  const jpegBase64 = await toSpotifyJpeg(imageBytes);

  return { jpegBase64, prompt };
}
