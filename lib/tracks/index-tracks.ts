import prisma from "../db/prisma";
import { embedText } from "./embed";
import { getArtistTags, getTrackTags } from "./sources/lastfm";
import { lookupMusicBrainz, MusicBrainzMatch } from "./sources/musicbrainz";
import { cleanTags } from "./tags";

export interface TrackToIndex {
  isrc: string;
  provider: "SPOTIFY" | "APPLE_MUSIC";
  externalId: string;
  title: string;
  artist: string;
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
      select: { isrc: true },
    })
  )
    return;

  const mb = await lookupIsrc(t.isrc);

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

async function collectTags(t: TrackToIndex): Promise<{
  title: string;
  artist: string;
  trackTags: string[];
  artistTags: string[];
  sources: string[];
}> {
  const mbData: MusicBrainzMatch | null = await lookupMusicBrainz(t.isrc);
  const artistFallback = t.artist.split(", ")[0];

  const [trackTags, artistTags] = await Promise.all([
    getTrackTags(
      mbData?.title ?? t.title,
      mbData?.artists[0] ?? artistFallback,
    ),
    getArtistTags(mbData?.artists[0] ?? artistFallback),
  ]);

  const artistNames = mbData?.artists ?? t.artist.split(", ");
  const cleanedTrackTags = cleanTags([...trackTags, ...(mbData?.tags ?? [])], {
    artistNames,
  });
  const cleanedArtistTags = cleanTags([...artistTags], { artistNames });
  const sources = [];
  if (mbData?.tags.length) sources.push("musicbrainz");
  if (trackTags.length || artistTags.length) sources.push("lastfm");

  return {
    title: mbData?.title ?? t.title,
    artist: mbData?.artists.join(", ") || t.artist,
    trackTags: cleanedTrackTags,
    artistTags: cleanedArtistTags,
    sources,
  };
}
