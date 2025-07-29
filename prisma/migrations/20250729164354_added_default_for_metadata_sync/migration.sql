/*
  Warnings:

  - Made the column `lastMetadataRefreshAt` on table `managed_playlists` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lastMetadataRefreshAt` on table `source_playlists` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "managed_playlists" ALTER COLUMN "lastMetadataRefreshAt" SET NOT NULL,
ALTER COLUMN "lastMetadataRefreshAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "source_playlists" ALTER COLUMN "lastMetadataRefreshAt" SET NOT NULL,
ALTER COLUMN "lastMetadataRefreshAt" SET DEFAULT CURRENT_TIMESTAMP;
