-- ============================================================================
-- PREVIEW SYSTEM MIGRATION
-- ============================================================================
-- Safe SQL migration to add Preview table and PreviewStatus enum
-- Run this directly in Supabase SQL Editor or using psql
--
-- Date: 2026-02-10
-- Schema: public
-- ============================================================================

-- Step 1: Create PreviewStatus enum type
DO $$ BEGIN
    CREATE TYPE "public"."PreviewStatus" AS ENUM (
        'DEPLOYING',
        'READY',
        'ERROR',
        'EXPIRED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create Preview table
CREATE TABLE IF NOT EXISTS "public"."Preview" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "deploymentId" TEXT NOT NULL,
    "status" "public"."PreviewStatus" NOT NULL DEFAULT 'DEPLOYING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Preview_pkey" PRIMARY KEY ("id")
);

-- Step 3: Create unique constraint on deploymentId (if not exists)
DO $$ BEGIN
    ALTER TABLE "public"."Preview" 
    ADD CONSTRAINT "Preview_deploymentId_key" UNIQUE ("deploymentId");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS "Preview_projectId_idx" ON "public"."Preview"("projectId");
CREATE INDEX IF NOT EXISTS "Preview_expiresAt_idx" ON "public"."Preview"("expiresAt");
CREATE INDEX IF NOT EXISTS "Preview_status_idx" ON "public"."Preview"("status");

-- Step 5: Add foreign key constraint to Project table (if not exists)
DO $$ BEGIN
    ALTER TABLE "public"."Preview" 
    ADD CONSTRAINT "Preview_projectId_fkey" 
    FOREIGN KEY ("projectId") 
    REFERENCES "public"."Project"("id") 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 6: Enable Row Level Security (RLS) - Recommended for Supabase
ALTER TABLE "public"."Preview" ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies (users can only see previews for their own projects)
DO $$ BEGIN
    -- Policy for SELECT: Users can view previews of their own projects
    CREATE POLICY "Users can view their own project previews"
    ON "public"."Preview"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "public"."Project" 
            WHERE "Project"."id" = "Preview"."projectId" 
            AND "Project"."userId" = auth.uid()
        )
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Policy for INSERT: Users can create previews for their own projects
    CREATE POLICY "Users can create previews for their own projects"
    ON "public"."Preview"
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "public"."Project" 
            WHERE "Project"."id" = "Preview"."projectId" 
            AND "Project"."userId" = auth.uid()
        )
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Policy for UPDATE: Users can update previews of their own projects
    CREATE POLICY "Users can update their own project previews"
    ON "public"."Preview"
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM "public"."Project" 
            WHERE "Project"."id" = "Preview"."projectId" 
            AND "Project"."userId" = auth.uid()
        )
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Policy for DELETE: Users can delete previews of their own projects
    CREATE POLICY "Users can delete their own project previews"
    ON "public"."Preview"
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM "public"."Project" 
            WHERE "Project"."id" = "Preview"."projectId" 
            AND "Project"."userId" = auth.uid()
        )
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the migration was successful

-- Check if Preview table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'Preview'
) AS preview_table_exists;

-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'Preview'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename = 'Preview';

-- Check foreign keys
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'Preview';

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'Preview';

-- Check RLS policies
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'Preview';

-- ============================================================================
-- ROLLBACK (IF NEEDED)
-- ============================================================================
-- Uncomment and run these if you need to remove the Preview system

-- DROP TABLE IF EXISTS "public"."Preview" CASCADE;
-- DROP TYPE IF EXISTS "public"."PreviewStatus";

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$ BEGIN
    RAISE NOTICE '✅ Preview system migration completed successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run: npx prisma db pull';
    RAISE NOTICE '2. Run: npx prisma generate';
    RAISE NOTICE '3. Restart your dev server';
END $$;
