/*
  Warnings:

  - Added the required column `spotifyPlaylistImageUrl` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `spotifyPlaylistName` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "spotifyPlaylistImageUrl" TEXT NOT NULL,
ADD COLUMN     "spotifyPlaylistName" TEXT NOT NULL;
