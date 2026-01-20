/*
  Warnings:

  - The values [SYNC_RUN] on the enum `AuditAction` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AuditAction_new" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'SUBSCRIBED', 'UNSUBSCRIBED', 'SYNC_RUN_STARTED', 'SYNC_RUN_COMPLETED', 'SYNC_RUN_FAILED');
ALTER TABLE "audit_logs" ALTER COLUMN "action" TYPE "AuditAction_new" USING ("action"::text::"AuditAction_new");
ALTER TYPE "AuditAction" RENAME TO "AuditAction_old";
ALTER TYPE "AuditAction_new" RENAME TO "AuditAction";
DROP TYPE "public"."AuditAction_old";
COMMIT;
