// Indexes tracks that are waiting in the tracks table (PENDING, and optionally
// FAILED) in batches, until none are left or --limit is reached.
//
// Usage:
//   pnpm tsx --env-file=.env scripts/backfill-tracks.ts               # every PENDING track
//   pnpm tsx --env-file=.env scripts/backfill-tracks.ts --limit 20    # stop after 20
//   pnpm tsx --env-file=.env scripts/backfill-tracks.ts --retry-failed
//
// Safe to stop with Ctrl+C and run again: each track's row is saved as soon as
// it's done, and finished tracks are never picked up twice.
import prisma from "../lib/db/prisma";
import { indexTracks } from "../lib/tracks/index-tracks";

const BATCH_SIZE = 25;
// Per-batch budget. Generous, since a script has no serverless time limit; it
// only bounds how long one batch can run before the next is fetched.
const BATCH_DEADLINE_MS = 10 * 60 * 1000;

function parseArgs() {
  const args = process.argv.slice(2);
  const limitIndex = args.indexOf("--limit");
  const limit = limitIndex === -1 ? Infinity : Number(args[limitIndex + 1]);
  if (!(limit > 0)) throw new Error("--limit needs a positive number");

  return { limit, retryFailed: args.includes("--retry-failed") };
}

async function main() {
  const { limit, retryFailed } = parseArgs();
  const statuses = retryFailed
    ? (["PENDING", "FAILED"] as const)
    : (["PENDING"] as const);

  // Every ISRC already handed to the indexer this run. A track that comes back
  // still PENDING (or FAILED again) isn't retried in the same run, so a track
  // that keeps failing can't loop forever.
  const seen = new Set<string>();

  while (seen.size < limit) {
    const batch = await prisma.track.findMany({
      where: {
        status: { in: [...statuses] },
        isrc: { notIn: [...seen] },
      },
      select: { isrc: true, title: true, artist: true },
      orderBy: { createdAt: "asc" },
      take: Math.min(BATCH_SIZE, limit - seen.size),
    });
    if (batch.length === 0) break;

    for (const t of batch) seen.add(t.isrc);
    console.log(`\nBatch of ${batch.length} (${seen.size} so far)`);

    // provider/externalId are only used to cache Spotify ids, and these rows
    // have none, so an empty externalId skips that step.
    await indexTracks(
      batch.map((t) => ({ ...t, provider: "SPOTIFY" as const, externalId: "" })),
      Date.now() + BATCH_DEADLINE_MS,
    );
  }

  const totals = await prisma.track.groupBy({
    by: ["status"],
    _count: true,
    orderBy: { status: "asc" },
  });
  console.log(`\nDone. Processed ${seen.size} tracks this run. Table now:`);
  for (const row of totals) console.log(`  ${row.status}: ${row._count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
