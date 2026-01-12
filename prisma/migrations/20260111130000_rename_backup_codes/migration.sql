-- AlterTable
-- Rename backupCodes column to twoFactorBackupCodes for consistency
ALTER TABLE "public"."User" RENAME COLUMN "backupCodes" TO "twoFactorBackupCodes";
