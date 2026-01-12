-- ============================================================================
-- 2FA COLUMNS MIGRATION FOR PRODUCTION DATABASE
-- ============================================================================
-- This script adds all 2FA-related columns to the User table if they don't exist.
-- Run this in your production Supabase SQL Editor.
-- ============================================================================

-- Add twoFactorEnabled column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'User' 
    AND column_name = 'twoFactorEnabled'
  ) THEN
    ALTER TABLE "public"."User" 
    ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
    RAISE NOTICE 'Added twoFactorEnabled column';
  ELSE
    RAISE NOTICE 'twoFactorEnabled column already exists';
  END IF;
END $$;

-- Add twoFactorSecret column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'User' 
    AND column_name = 'twoFactorSecret'
  ) THEN
    ALTER TABLE "public"."User" 
    ADD COLUMN "twoFactorSecret" TEXT;
    RAISE NOTICE 'Added twoFactorSecret column';
  ELSE
    RAISE NOTICE 'twoFactorSecret column already exists';
  END IF;
END $$;

-- Add twoFactorBackupCodes column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'User' 
    AND column_name = 'twoFactorBackupCodes'
  ) THEN
    ALTER TABLE "public"."User" 
    ADD COLUMN "twoFactorBackupCodes" TEXT[] DEFAULT '{}'::text[];
    RAISE NOTICE 'Added twoFactorBackupCodes column';
  ELSE
    RAISE NOTICE 'twoFactorBackupCodes column already exists';
  END IF;
END $$;

-- If old backupCodes column exists, migrate data and drop it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'User' 
    AND column_name = 'backupCodes'
  ) THEN
    -- Migrate data from old column to new column
    UPDATE "public"."User" 
    SET "twoFactorBackupCodes" = "backupCodes"
    WHERE "backupCodes" IS NOT NULL AND "backupCodes" <> '{}';
    
    -- Drop old column
    ALTER TABLE "public"."User" DROP COLUMN "backupCodes";
    RAISE NOTICE 'Migrated and dropped old backupCodes column';
  ELSE
    RAISE NOTICE 'Old backupCodes column does not exist - no migration needed';
  END IF;
END $$;

-- Add accountLockedUntil column if it doesn't exist (for security)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'User' 
    AND column_name = 'accountLockedUntil'
  ) THEN
    ALTER TABLE "public"."User" 
    ADD COLUMN "accountLockedUntil" TIMESTAMP(3);
    RAISE NOTICE 'Added accountLockedUntil column';
  ELSE
    RAISE NOTICE 'accountLockedUntil column already exists';
  END IF;
END $$;

-- Add failedLoginAttempts column if it doesn't exist (for security)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'User' 
    AND column_name = 'failedLoginAttempts'
  ) THEN
    ALTER TABLE "public"."User" 
    ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added failedLoginAttempts column';
  ELSE
    RAISE NOTICE 'failedLoginAttempts column already exists';
  END IF;
END $$;

-- Add lastLoginAt column if it doesn't exist (for security tracking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'User' 
    AND column_name = 'lastLoginAt'
  ) THEN
    ALTER TABLE "public"."User" 
    ADD COLUMN "lastLoginAt" TIMESTAMP(3);
    RAISE NOTICE 'Added lastLoginAt column';
  ELSE
    RAISE NOTICE 'lastLoginAt column already exists';
  END IF;
END $$;

-- Add lastLoginIp column if it doesn't exist (for security tracking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'User' 
    AND column_name = 'lastLoginIp'
  ) THEN
    ALTER TABLE "public"."User" 
    ADD COLUMN "lastLoginIp" TEXT;
    RAISE NOTICE 'Added lastLoginIp column';
  ELSE
    RAISE NOTICE 'lastLoginIp column already exists';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify all columns were added successfully:

SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'User'
  AND column_name IN (
    'twoFactorEnabled',
    'twoFactorSecret',
    'twoFactorBackupCodes',
    'accountLockedUntil',
    'failedLoginAttempts',
    'lastLoginAt',
    'lastLoginIp'
  )
ORDER BY column_name;

-- ============================================================================
-- EXPECTED OUTPUT:
-- ============================================================================
-- column_name             | data_type         | column_default | is_nullable
-- ------------------------+-------------------+----------------+-------------
-- accountLockedUntil      | timestamp(3)      | NULL           | YES
-- failedLoginAttempts     | integer           | 0              | NO
-- lastLoginAt             | timestamp(3)      | NULL           | YES
-- lastLoginIp             | text              | NULL           | YES
-- twoFactorBackupCodes    | ARRAY             | '{}'::text[]   | YES
-- twoFactorEnabled        | boolean           | false          | NO
-- twoFactorSecret         | text              | NULL           | YES
-- ============================================================================
