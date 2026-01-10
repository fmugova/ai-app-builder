-- COMPLETE FIX: Delete failed migration records and let Prisma reapply
-- Run this in your Supabase SQL Editor for PRODUCTION database
-- Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new

-- Step 1: Check current state
SELECT 
    id,
    migration_name,
    applied_steps_count,
    started_at,
    finished_at,
    logs
FROM "_prisma_migrations" 
WHERE migration_name = '20260110181255_baseline'
ORDER BY started_at DESC;

-- Step 2: DELETE all failed migration records completely
-- This allows Prisma to reapply the migration cleanly
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20260110181255_baseline';

-- Step 3: Verify deletion (should return 0 rows)
SELECT 
    id,
    migration_name,
    applied_steps_count,
    started_at,
    finished_at,
    logs
FROM "_prisma_migrations" 
WHERE migration_name = '20260110181255_baseline'
ORDER BY started_at DESC;

-- Expected result: No rows (migration record deleted)
-- Next Vercel deployment will reapply this migration from scratch
