-- ============================================================================
-- COMPREHENSIVE MIGRATION CLEANUP FOR PRODUCTION
-- ============================================================================
-- This will delete ALL failed migration records and keep only successful ones
-- ============================================================================

-- Step 1: View current mess
SELECT 
    migration_name,
    started_at,
    finished_at,
    applied_steps_count
FROM "_prisma_migrations" 
WHERE finished_at IS NULL
ORDER BY started_at DESC;

-- Step 2: DELETE ALL failed migration records (finished_at IS NULL)
-- These are causing the P3009 errors
DELETE FROM "_prisma_migrations"
WHERE finished_at IS NULL;

-- Step 3: View all remaining successfully applied migrations
SELECT 
    migration_name,
    started_at,
    finished_at,
    applied_steps_count
FROM "_prisma_migrations" 
ORDER BY started_at DESC;

-- ============================================================================
-- After running this, run: npx prisma migrate deploy
-- It will apply any missing migrations cleanly
-- ============================================================================
