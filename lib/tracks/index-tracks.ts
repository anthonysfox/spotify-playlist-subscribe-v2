import { embed } from "ai";
import { google } from "@ai-sdk/google";
import prisma from "../db/prisma";

export interface TrackToIndex {
  isrc: string;
  provider: "SPOTIFY" | "APPLE_MUSIC";
  externalId: string;
  title: string;
  artist: string;
}

export async function embedText(text: string, kind: "track" | "search") {
  const { embedding } = await embed({
    model: google.embedding("gemini-embedding-001"),
    value: text,
    providerOptions: {
      google: {
        outputDimensionality: 1536,
        taskType: kind === "track" ? "RETRIEVAL_DOCUMENT" : "RETRIEVAL_QUERY",
      },
    },
  });

  return embedding;
}

async function lookupIsrc(isrc: string) {
  const res = await fetch(
    `https://musicbrainz.org/ws/2/isrc/${isrc}?inc=artists+tags&fmt=json`,
    {
      headers: {
        "User-Agent": "PlaylistFox/1.0 ( https://anthonyfox.dev )",
      },
    },
  );

  if (res.status === 400 || res.status === 404) return null;
  if (!res.ok) throw new Error(`MusicBrainz error: ${res.status}`);
  const rec = (await res.json()).recordings?.[0];
  if (!rec) return null;
  console.log(rec);
  return {
    title: rec.title as string,
    artist: rec["artist-credit"].map((a: any) => a.name).join(", ") as string,
    tags: [...(rec.tags ?? [])]
      .map((t: any) => t.name)
      .slice(0, 10) as string[],
  };
}

export async function saveTrack(t: TrackToIndex) {
  if (
    await prisma.track.findUnique({
      where: { isrc: t.isrc },
      select: { id: true },
    })
  )
    return;

  const mb = await lookupIsrc(t.isrc);
  console.log(mb);

  const content =
    `${mb?.title ?? t.title} by ${mb?.artist ?? t.artist}` +
    (mb?.tags?.length ? `. Tags: ${mb.tags.join(", ")}` : "");
  const vec = await embedText(content, "track");

  await prisma.$executeRaw`
    INSERT INTO tracks (id, isrc, provider, external_id, title, artist, content, embedding)
    VALUES (${crypto.randomUUID()}, ${t.isrc}, ${t.provider}::"MusicProvider", ${t.externalId}, ${mb?.title ?? t.title}, ${mb?.artist ?? t.artist}, ${content}, ${JSON.stringify(vec)}::vector)
    ON CONFLICT (isrc) DO NOTHING
  `;
}

export async function indexTracks(tracks: TrackToIndex[], deadline: number) {
  console.log(`Starting track index job at ${new Date().toISOString()}`, {
    tracks,
  });
  const existing = await prisma.track.findMany({
    where: { isrc: { in: tracks.map((t) => t.isrc) } },
    select: { isrc: true },
  });
  const known = new Set(existing.map((t) => t.isrc));

  for (const track of tracks) {
    if (known.has(track.isrc)) continue;
    if (Date.now() >= deadline) break;

    try {
      await saveTrack(track);
    } catch (error) {
      console.error(`Failed to index ${track.isrc}: `, error);
    }

    await new Promise((resolve) => setTimeout(resolve, 1100)); // MusicBrainz limit
  }

  console.log(`Ended track index job at ${new Date().toISOString()}`);
}
