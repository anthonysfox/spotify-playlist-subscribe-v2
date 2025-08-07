-- AlterTable
ALTER TABLE "users" ADD COLUMN     "spotify_access_token" TEXT,
ADD COLUMN     "spotify_refresh_token" TEXT,
ADD COLUMN     "spotify_token_expires_at" TIMESTAMP(3);
