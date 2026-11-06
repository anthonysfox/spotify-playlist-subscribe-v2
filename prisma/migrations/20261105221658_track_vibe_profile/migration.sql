/*
  Warnings:

  - The primary key for the `tracks` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `content` on the `tracks` table. All the data in the column will be lost.
  - You are about to drop the column `external_id` on the `tracks` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `tracks` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `tracks` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TrackIndexStatus" AS ENUM ('PENDING', 'INDEXED', 'UNINDEXED', 'FAILED');

-- DropIndex
DROP INDEX "tracks_isrc_key";

-- AlterTable
ALTER TABLE "tracks" DROP CONSTRAINT "tracks_pkey",
DROP COLUMN "content",
DROP COLUMN "external_id",
DROP COLUMN "id",
DROP COLUMN "provider",
ADD COLUMN     "acousticness" DOUBLE PRECISION,
ADD COLUMN     "energy" DOUBLE PRECISION,
ADD COLUMN     "indexed_at" TIMESTAMP(3),
ADD COLUMN     "instrumentalness" DOUBLE PRECISION,
ADD COLUMN     "metadata_sources" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "status" "TrackIndexStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "tags" JSONB,
ADD COLUMN     "tempo_bpm" INTEGER,
ADD COLUMN     "valence" DOUBLE PRECISION,
ADD COLUMN     "vibe_profile" TEXT,
ALTER COLUMN "embedding" DROP NOT NULL,
ADD CONSTRAINT "tracks_pkey" PRIMARY KEY ("isrc");

-- CreateTable
CREATE TABLE "spotify_track_cache" (
    "isrc" VARCHAR(20) NOT NULL,
    "spotify_track_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spotify_track_cache_pkey" PRIMARY KEY ("isrc")
);

-- CreateIndex
CREATE INDEX "spotify_track_cache_expires_at_idx" ON "spotify_track_cache"("expires_at");
