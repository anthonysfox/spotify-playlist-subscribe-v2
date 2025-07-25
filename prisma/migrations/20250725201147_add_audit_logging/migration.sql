-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'SUBSCRIBED', 'UNSUBSCRIBED');

-- AlterTable
ALTER TABLE "managed_playlists" ADD COLUMN     "deletedBy" TEXT;

-- AlterTable
ALTER TABLE "source_playlists" ADD COLUMN     "deletedBy" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deletedBy" TEXT;

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "oldValues" JSONB,
    "newValues" JSONB,
    "metadata" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "managed_playlists_deletedBy_idx" ON "managed_playlists"("deletedBy");

-- CreateIndex
CREATE INDEX "source_playlists_deletedBy_idx" ON "source_playlists"("deletedBy");
