/*
  Warnings:

  - A unique constraint covering the columns `[spotifyPlaylistId,deletedAt]` on the table `managed_playlists` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[spotifyPlaylistId,deletedAt]` on the table `source_playlists` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email,deletedAt]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "managed_playlists_spotifyPlaylistId_key";

-- DropIndex
DROP INDEX "source_playlists_spotifyPlaylistId_key";

-- DropIndex
DROP INDEX "users_email_key";

-- CreateIndex
CREATE UNIQUE INDEX "managed_playlists_spotifyPlaylistId_deletedAt_key" ON "managed_playlists"("spotifyPlaylistId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "source_playlists_spotifyPlaylistId_deletedAt_key" ON "source_playlists"("spotifyPlaylistId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_deletedAt_key" ON "users"("email", "deletedAt");
