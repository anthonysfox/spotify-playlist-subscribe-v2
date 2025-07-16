/*
  Warnings:

  - The primary key for the `managed_playlist_source_subscriptions` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "managed_playlist_source_subscriptions" DROP CONSTRAINT "managed_playlist_source_subscriptions_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "managed_playlist_source_subscriptions_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "managed_playlist_source_subscriptions_id_seq";
