-- CreateEnum
CREATE TYPE "SyncMode" AS ENUM ('APPEND', 'REPLACE');

-- AlterEnum
ALTER TYPE "SubscriptionFrequency" ADD VALUE 'CUSTOM';

-- AlterTable
ALTER TABLE "managed_playlists" ADD COLUMN     "customDays" TEXT,
ADD COLUMN     "customTime" TEXT,
ADD COLUMN     "explicitContentFilter" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "syncMode" "SyncMode" NOT NULL DEFAULT 'APPEND',
ADD COLUMN     "trackAgeLimit" INTEGER NOT NULL DEFAULT 0;
