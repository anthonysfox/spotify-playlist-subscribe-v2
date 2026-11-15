import prisma from "../db/prisma";
import type { DBVibeTrack } from "../music/types";
import { embedText } from "./embed";

// Hybrid search: ranks tracks by meaning (vector distance) and by exact words
// (Postgres full-text search on vibe_profile), then merges the two rankings
// with Reciprocal Rank Fusion: score = 1/(60 + rank) from each list, summed.
const CANDIDATES = 50;
const RRF_K = 60;

export async function searchTracksByVibe(
  vibe: string,
  limit: number,
): Promise<DBVibeTrack[]> {
  const vec = JSON.stringify(await embedText(vibe, "search"));

  return prisma.$queryRaw<DBVibeTrack[]>`
    WITH semantic AS (
      SELECT isrc, ROW_NUMBER() OVER (ORDER BY embedding <=> ${vec}::vector) AS rank
      FROM tracks
      WHERE status = 'INDEXED'
      ORDER BY rank
      LIMIT ${CANDIDATES}
    ),
    keyword AS (
      SELECT isrc,
        ROW_NUMBER() OVER (
          ORDER BY ts_rank(to_tsvector('english', vibe_profile), websearch_to_tsquery('english', ${vibe})) DESC
        ) AS rank
      FROM tracks
      WHERE status = 'INDEXED'
        AND to_tsvector('english', vibe_profile) @@ websearch_to_tsquery('english', ${vibe})
      ORDER BY rank
      LIMIT ${CANDIDATES}
    )
    SELECT t.title, t.artist, t.isrc,
      1 - (t.embedding <=> ${vec}::vector) AS similarity
    FROM semantic s
    FULL OUTER JOIN keyword k ON k.isrc = s.isrc
    JOIN tracks t ON t.isrc = COALESCE(s.isrc, k.isrc)
    ORDER BY COALESCE(1.0 / (${RRF_K} + s.rank), 0) + COALESCE(1.0 / (${RRF_K} + k.rank), 0) DESC
    LIMIT ${limit}
  `;
}
