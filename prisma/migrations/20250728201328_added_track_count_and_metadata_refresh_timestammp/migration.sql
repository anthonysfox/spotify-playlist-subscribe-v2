-- AlterTable
ALTER TABLE "managed_playlists" ADD COLUMN     "lastMetadataRefreshAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "source_playlists" ADD COLUMN     "lastMetadataRefreshAt" TIMESTAMP(3),
ADD COLUMN     "trackCount" INTEGER NOT NULL DEFAULT 0;
