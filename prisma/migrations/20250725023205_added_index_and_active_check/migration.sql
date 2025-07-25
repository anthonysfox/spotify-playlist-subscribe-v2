-- AlterTable
ALTER TABLE "source_playlists" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastCheckedActiveAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "managed_playlist_source_subscriptions_managedPlaylistId_idx" ON "managed_playlist_source_subscriptions"("managedPlaylistId");

-- CreateIndex
CREATE INDEX "managed_playlist_source_subscriptions_sourcePlaylistId_idx" ON "managed_playlist_source_subscriptions"("sourcePlaylistId");

-- CreateIndex
CREATE INDEX "managed_playlist_source_subscriptions_lastSyncedFromSourceA_idx" ON "managed_playlist_source_subscriptions"("lastSyncedFromSourceAt");

-- CreateIndex
CREATE INDEX "managed_playlists_spotifyPlaylistId_idx" ON "managed_playlists"("spotifyPlaylistId");

-- CreateIndex
CREATE INDEX "managed_playlists_nextSyncTime_idx" ON "managed_playlists"("nextSyncTime");

-- CreateIndex
CREATE INDEX "managed_playlists_lastSyncCompletedAt_idx" ON "managed_playlists"("lastSyncCompletedAt");

-- CreateIndex
CREATE INDEX "source_playlists_spotifyPlaylistId_idx" ON "source_playlists"("spotifyPlaylistId");
