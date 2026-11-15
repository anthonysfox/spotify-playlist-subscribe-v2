import prisma from "../db/prisma";
import type { DBVibeTrack } from "../music/types";
import { embedText } from "./embed";

export async function searchTracksByVibe(
  vibe: string,
  limit: number,
): Promise<DBVibeTrack[]> {
  const vec = JSON.stringify(await embedText(vibe, "search"));
  const rows = await prisma.$queryRaw<DBVibeTrack[]>`
          SELECT title, artist, isrc, 1 - (embedding <=> ${vec}::vector) AS similarity
          FROM tracks
          WHERE status = 'INDEXED'
          ORDER BY embedding <=> ${vec}::vector
          LIMIT ${limit}
        `;
  return rows;
}
