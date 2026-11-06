-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "tracks" (
    "id" TEXT NOT NULL,
    "isrc" VARCHAR(20) NOT NULL,
    "provider" "MusicProvider" NOT NULL,
    "external_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tracks_isrc_key" ON "tracks"("isrc");

CREATE INDEX tracks_embedding_hnsw
  ON tracks USING hnsw (embedding vector_cosine_ops);

