// Trial run of the new indexer on a few PENDING tracks.
// Usage: pnpm tsx --env-file=.env scripts/try-index.ts [count]
import prisma from "../lib/db/prisma";
import { indexTracks } from "../lib/tracks/index-tracks";

async function main() {
  const count = Number(process.argv[2] ?? 5);

  const rows = await prisma.track.findMany({
    where: { status: "PENDING" },
    select: { isrc: true, title: true, artist: true },
    take: count,
  });

  if (rows.length === 0) {
    console.log("No PENDING tracks left.");
    return;
  }

  // provider and externalId aren't used by the indexer.
  await indexTracks(
    rows.map((r) => ({ ...r, provider: "SPOTIFY", externalId: "" })),
    Date.now() + 120_000,
  );

  const results = await prisma.track.findMany({
    where: { isrc: { in: rows.map((r) => r.isrc) } },
    select: {
      isrc: true,
      title: true,
      artist: true,
      status: true,
      metadataSources: true,
      tags: true,
      vibeProfile: true,
    },
  });

  for (const r of results) {
    console.log(`\n${r.status}  ${r.title} — ${r.artist} (${r.isrc})`);
    console.log(`  sources: ${r.metadataSources.join(", ") || "none"}`);
    console.log(`  tags: ${JSON.stringify(r.tags)}`);
    if (r.vibeProfile) console.log(r.vibeProfile.replace(/^/gm, "  | "));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
