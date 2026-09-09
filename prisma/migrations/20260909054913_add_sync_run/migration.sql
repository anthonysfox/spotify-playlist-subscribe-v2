-- CreateEnum
CREATE TYPE "SyncRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "SyncRunTrigger" AS ENUM ('SCHEDULED', 'MANUAL');

-- CreateTable
CREATE TABLE "sync_runs" (
    "id" TEXT NOT NULL,
    "managedPlaylistId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SyncRunStatus" NOT NULL DEFAULT 'RUNNING',
    "trigger" "SyncRunTrigger" NOT NULL DEFAULT 'SCHEDULED',
    "tracksAdded" INTEGER NOT NULL DEFAULT 0,
    "skippedAlreadyPresent" INTEGER NOT NULL DEFAULT 0,
    "skippedExplicit" INTEGER NOT NULL DEFAULT 0,
    "skippedTooOld" INTEGER NOT NULL DEFAULT 0,
    "skippedByVibe" INTEGER NOT NULL DEFAULT 0,
    "skipReason" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "sourceBreakdown" JSONB,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sync_runs_managedPlaylistId_startedAt_idx" ON "sync_runs"("managedPlaylistId", "startedAt");

-- CreateIndex
CREATE INDEX "sync_runs_userId_startedAt_idx" ON "sync_runs"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "sync_runs_status_idx" ON "sync_runs"("status");

-- AddForeignKey
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_managedPlaylistId_fkey" FOREIGN KEY ("managedPlaylistId") REFERENCES "managed_playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
