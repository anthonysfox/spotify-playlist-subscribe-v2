import prisma from "../db/prisma";
import { embedText } from "./embed";
import { getArtistTags, getTrackTags } from "./sources/lastfm";
import { lookupMusicBrainz, MusicBrainzMatch } from "./sources/musicbrainz";
import { cleanTags } from "./tags";
import { cacheSpotifyIds } from "./spotify-ids";
import {
  formatVibeProfile,
  generateVibeProfile,
  hasEnoughSignal,
} from "./vibe-profile";

export interface TrackToIndex {
  isrc: string;
  provider: "SPOTIFY" | "APPLE_MUSIC";
  externalId: string;
  title: string;
  artist: string;
}

export async function indexTracks(tracks: TrackToIndex[], deadline: number) {
  // The sync already fetched each track's Spotify id along with its ISRC, so
  // caching them here costs no API calls and saves a /search later. A failure
  // only means a cache miss later, so it mustn't stop indexing.
  try {
    await cacheSpotifyIds(
      tracks
        .filter((t) => t.provider === "SPOTIFY" && t.externalId)
        .map((t) => ({ isrc: t.isrc, spotifyTrackId: t.externalId })),
    );
  } catch (error) {
    console.error("Failed to cache Spotify track ids: ", error);
  }

  const existing = await prisma.track.findMany({
    where: {
      isrc: { in: tracks.map((t) => t.isrc) },
      status: { in: ["INDEXED", "UNINDEXED"] },
    },
    select: { isrc: true },
  });
  const known = new Set(existing.map((t) => t.isrc));

  const counts = {
    indexed: 0,
    failed: 0,
    unindexed: 0,
  };
  for (const track of tracks) {
    if (known.has(track.isrc)) continue;

    if (Date.now() >= deadline) break;

    try {
      const result = await indexTrack(track);
      if (result === "INDEXED") counts.indexed += 1;
      if (result === "UNINDEXED") counts.unindexed += 1;
    } catch (error) {
      console.error(`Failed to index ${track.isrc}: `, error);

      counts.failed += 1;

      try {
        await prisma.track.upsert({
          where: { isrc: track.isrc },
          create: {
            isrc: track.isrc,
            title: track.title,
            artist: track.artist,
            status: "FAILED",
          },
          update: {
            status: "FAILED",
          },
        });
      } catch (writeError) {
        console.error(`Couldn't mark ${track.isrc} as FAILED: `, writeError);
      }
    }
  }

  const notReached =
    tracks.length -
    known.size -
    counts.indexed -
    counts.unindexed -
    counts.failed;

  console.log(
    `Ended track index job at ${new Date().toISOString()}. Indexed: ${counts.indexed}, unindexed: ${counts.unindexed}, failed: ${counts.failed}, skipped: ${known.size}, unreached tracks: ${notReached}`,
  );
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

async function indexTrack(t: TrackToIndex): Promise<"INDEXED" | "UNINDEXED"> {
  const evidence = await collectTags(t);

  if (!hasEnoughSignal(evidence.trackTags, evidence.artistTags)) {
    const data = {
      title: evidence.title,
      artist: evidence.artist,
      status: "UNINDEXED" as const,
      tags: {
        artist: evidence.artistTags,
        track: evidence.trackTags,
      },
      metadataSources: evidence.sources,
    };

    await prisma.track.upsert({
      where: { isrc: t.isrc },
      create: {
        isrc: t.isrc,
        ...data,
      },
      update: {
        ...data,
        vibeProfile: null,
      },
    });
    return "UNINDEXED";
  }

  const vibeProfile = await generateVibeProfile(
    evidence.trackTags,
    evidence.artistTags,
  );

  const text = formatVibeProfile(vibeProfile);
  const vec = await embedText(text, "track");
  await prisma.$executeRaw`
    INSERT INTO tracks (isrc, title, artist, tags, metadata_sources, status, indexed_at, vibe_profile, embedding)
    VALUES (${t.isrc}, ${evidence.title}, ${evidence.artist}, ${JSON.stringify({ track: evidence.trackTags, artist: evidence.artistTags })}::jsonb, ${evidence.sources}, 'INDEXED'::"TrackIndexStatus", ${new Date()}, ${text}, ${JSON.stringify(vec)}::vector)
    ON CONFLICT (isrc) DO UPDATE SET 
      title = EXCLUDED.title,
      artist = EXCLUDED.artist,
      tags = EXCLUDED.tags,
      metadata_sources = EXCLUDED.metadata_sources,
      status = EXCLUDED.status,
      indexed_at = EXCLUDED.indexed_at,
      vibe_profile = EXCLUDED.vibe_profile,
      embedding = EXCLUDED.embedding
  `;

  return "INDEXED";
}
