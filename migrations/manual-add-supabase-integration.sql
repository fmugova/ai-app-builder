-- Manual Migration: Add Supabase Integration Support
-- Run this SQL directly in your production database
-- Date: 2026-02-08

-- Step 1: Create SupabaseIntegration table
CREATE TABLE IF NOT EXISTS "public"."SupabaseIntegration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "organizationId" TEXT,
    "username" TEXT,
    "email" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupabaseIntegration_pkey" PRIMARY KEY ("id")
);

-- Step 2: Create unique constraint on userId
CREATE UNIQUE INDEX IF NOT EXISTS "SupabaseIntegration_userId_key" ON "public"."SupabaseIntegration"("userId");

-- Step 3: Create index on userId for performance
CREATE INDEX IF NOT EXISTS "SupabaseIntegration_userId_idx" ON "public"."SupabaseIntegration"("userId");

-- Step 4: Add foreign key constraint to User table
ALTER TABLE "public"."SupabaseIntegration" 
ADD CONSTRAINT "SupabaseIntegration_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "public"."User"("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 5: Enhance Deployment table with Supabase fields
-- Check if columns exist before adding them
DO $$ 
BEGIN
    -- Add supabaseProjectId
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Deployment' 
        AND column_name = 'supabaseProjectId'
    ) THEN
        ALTER TABLE "public"."Deployment" ADD COLUMN "supabaseProjectId" TEXT;
    END IF;

    -- Add supabaseUrl
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Deployment' 
        AND column_name = 'supabaseUrl'
    ) THEN
        ALTER TABLE "public"."Deployment" ADD COLUMN "supabaseUrl" TEXT;
    END IF;

    -- Add supabaseAnonKey
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Deployment' 
        AND column_name = 'supabaseAnonKey'
    ) THEN
        ALTER TABLE "public"."Deployment" ADD COLUMN "supabaseAnonKey" TEXT;
    END IF;

    -- Add supabaseServiceKey
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Deployment' 
        AND column_name = 'supabaseServiceKey'
    ) THEN
        ALTER TABLE "public"."Deployment" ADD COLUMN "supabaseServiceKey" TEXT;
    END IF;

    -- Add databasePassword
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Deployment' 
        AND column_name = 'databasePassword'
    ) THEN
        ALTER TABLE "public"."Deployment" ADD COLUMN "databasePassword" TEXT;
    END IF;

    -- Add buildTime
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Deployment' 
        AND column_name = 'buildTime'
    ) THEN
        ALTER TABLE "public"."Deployment" ADD COLUMN "buildTime" INTEGER;
    END IF;

    -- Add deployedAt
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Deployment' 
        AND column_name = 'deployedAt'
    ) THEN
        ALTER TABLE "public"."Deployment" ADD COLUMN "deployedAt" TIMESTAMP(3);
    END IF;
END $$;

-- Step 6: Verify the changes
SELECT 
    'SupabaseIntegration table created' as status,
    COUNT(*) as record_count 
FROM "public"."SupabaseIntegration";

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'Deployment'
AND column_name IN (
    'supabaseProjectId',
    'supabaseUrl', 
    'supabaseAnonKey',
    'supabaseServiceKey',
    'databasePassword',
    'buildTime',
    'deployedAt'
)
ORDER BY column_name;

-- Success message
SELECT '✅ Migration completed successfully! Supabase integration support added.' as message;
