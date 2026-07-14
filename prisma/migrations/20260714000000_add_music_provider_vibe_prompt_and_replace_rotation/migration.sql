-- CreateEnum
CREATE TYPE "MusicProvider" AS ENUM ('SPOTIFY', 'APPLE_MUSIC');

-- DropIndex
DROP INDEX "managed_playlists_spotifyPlaylistId_deletedAt_key";

-- DropIndex
DROP INDEX "source_playlists_spotifyPlaylistId_deletedAt_key";

-- AlterTable
ALTER TABLE "managed_playlists" ADD COLUMN     "provider" "MusicProvider" NOT NULL DEFAULT 'SPOTIFY',
ADD COLUMN     "vibePrompt" TEXT;

-- AlterTable
ALTER TABLE "source_playlists" ADD COLUMN     "provider" "MusicProvider" NOT NULL DEFAULT 'SPOTIFY';

-- AlterTable
ALTER TABLE "managed_playlist_source_subscriptions" ADD COLUMN     "recentlyServed" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "managed_playlists_provider_spotifyPlaylistId_deletedAt_key" ON "managed_playlists"("provider", "spotifyPlaylistId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "source_playlists_provider_spotifyPlaylistId_deletedAt_key" ON "source_playlists"("provider", "spotifyPlaylistId", "deletedAt");

