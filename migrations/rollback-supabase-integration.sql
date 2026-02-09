-- Rollback Script: Remove Supabase Integration Support
-- Run this SQL if you need to rollback the changes
-- Date: 2026-02-08
-- WARNING: This will delete all Supabase integration data!

-- Step 1: Drop foreign key constraint first
ALTER TABLE "public"."SupabaseIntegration" 
DROP CONSTRAINT IF EXISTS "SupabaseIntegration_userId_fkey";

-- Step 2: Drop SupabaseIntegration table
DROP TABLE IF EXISTS "public"."SupabaseIntegration";

-- Step 3: Remove columns from Deployment table
ALTER TABLE "public"."Deployment" 
DROP COLUMN IF EXISTS "supabaseProjectId",
DROP COLUMN IF EXISTS "supabaseUrl",
DROP COLUMN IF EXISTS "supabaseAnonKey",
DROP COLUMN IF EXISTS "supabaseServiceKey",
DROP COLUMN IF EXISTS "databasePassword",
DROP COLUMN IF EXISTS "buildTime",
DROP COLUMN IF EXISTS "deployedAt";

-- Success message
SELECT '✅ Rollback completed successfully!' as message;
