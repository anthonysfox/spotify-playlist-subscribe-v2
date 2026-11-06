import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import prisma from "../lib/db/prisma";

/**
 * Export track embeddings for the TensorFlow Embedding Projector. Read-only
 * against the database. Writes two row-aligned files:
 *
 *   vectors.tsv   one embedding per line, no header
 *   metadata.tsv  title, artist and the embedded text, with a header row
 *
 *   pnpm tracks:export [outDir]    (default: exports/embeddings)
 *
 * Then at https://projector.tensorflow.org choose Load and upload both files.
 */

/** Tabs and newlines would shift columns or rows out of line with vectors.tsv. */
const cell = (value: string) => value.replace(/\s+/g, " ").trim();

async function main() {
  const outDir = resolve(process.argv[2] ?? "exports/embeddings");

  // pgvector has no Prisma type, so read it as text: "[0.1,0.2,...]".
  const rows = await prisma.$queryRaw<
    { title: string; artist: string; content: string; embedding: string }[]
  >`
    SELECT title, artist, content, embedding::text AS embedding
    FROM tracks
    ORDER BY created_at, id
  `;

  if (rows.length === 0) {
    console.log("No tracks to export.");
    return;
  }

  const vectors = rows.map((row) =>
    (JSON.parse(row.embedding) as number[]).join("\t"),
  );
  const metadata = rows.map((row) =>
    [row.title, row.artist, row.content].map(cell).join("\t"),
  );

  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, "vectors.tsv"), vectors.join("\n") + "\n");
  await writeFile(
    resolve(outDir, "metadata.tsv"),
    ["title\tartist\tcontent", ...metadata].join("\n") + "\n",
  );

  console.log(`Exported ${rows.length} tracks to ${outDir}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
