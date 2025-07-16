/*
  Warnings:

  - You are about to drop the column `spotifyUserId` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "users_spotifyUserId_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "spotifyUserId";
