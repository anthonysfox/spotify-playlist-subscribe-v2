/*
  Warnings:

  - You are about to drop the `Subscription` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_userId_fkey";

-- DropTable
DROP TABLE "Subscription";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "managed_playlists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "spotifyPlaylistId" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "imageUrl" VARCHAR(512),
    "syncInterval" "SubscriptionFrequency" NOT NULL,
    "syncQuantityPerSource" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncCompletedAt" TIMESTAMP(3),
    "nextSyncTime" TIMESTAMP(3),

    CONSTRAINT "managed_playlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_playlists" (
    "id" TEXT NOT NULL,
    "spotifyPlaylistId" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "imageUrl" VARCHAR(512),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_playlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "managed_playlist_source_subscriptions" (
    "id" SERIAL NOT NULL,
    "managedPlaylistId" TEXT NOT NULL,
    "sourcePlaylistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedFromSourceAt" TIMESTAMP(3),

    CONSTRAINT "managed_playlist_source_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkUserId_key" ON "users"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "managed_playlists_spotifyPlaylistId_key" ON "managed_playlists"("spotifyPlaylistId");

-- CreateIndex
CREATE INDEX "managed_playlists_userId_idx" ON "managed_playlists"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "source_playlists_spotifyPlaylistId_key" ON "source_playlists"("spotifyPlaylistId");

-- CreateIndex
CREATE UNIQUE INDEX "managed_playlist_source_subscriptions_managedPlaylistId_sou_key" ON "managed_playlist_source_subscriptions"("managedPlaylistId", "sourcePlaylistId");

-- AddForeignKey
ALTER TABLE "managed_playlists" ADD CONSTRAINT "managed_playlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("clerkUserId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "managed_playlist_source_subscriptions" ADD CONSTRAINT "managed_playlist_source_subscriptions_managedPlaylistId_fkey" FOREIGN KEY ("managedPlaylistId") REFERENCES "managed_playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "managed_playlist_source_subscriptions" ADD CONSTRAINT "managed_playlist_source_subscriptions_sourcePlaylistId_fkey" FOREIGN KEY ("sourcePlaylistId") REFERENCES "source_playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
