-- ============================================================================
-- Add Webhook Retry Fields to Production Database
-- ============================================================================
-- Created: February 10, 2026
-- Purpose: Add retry functionality to WebhookEvent table
-- 
-- IMPORTANT: 
-- - Review this script before running in production
-- - This script is idempotent (safe to run multiple times)
-- - Run during low-traffic period if possible
-- ============================================================================

-- Start transaction for safety
BEGIN;

-- ============================================================================
-- Step 1: Add new columns if they don't exist
-- ============================================================================

-- Add attempts column (tracks number of retry attempts)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'WebhookEvent' 
        AND column_name = 'attempts'
    ) THEN
        ALTER TABLE "public"."WebhookEvent" 
        ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
        
        RAISE NOTICE 'Added attempts column to WebhookEvent';
    ELSE
        RAISE NOTICE 'Column attempts already exists, skipping';
    END IF;
END $$;

-- Add retryAt column (timestamp for next retry attempt)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'WebhookEvent' 
        AND column_name = 'retryAt'
    ) THEN
        ALTER TABLE "public"."WebhookEvent" 
        ADD COLUMN "retryAt" TIMESTAMP(3);
        
        RAISE NOTICE 'Added retryAt column to WebhookEvent';
    ELSE
        RAISE NOTICE 'Column retryAt already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- Step 2: Create indexes for performance (if they don't exist)
-- ============================================================================

-- Index for finding webhooks ready for retry
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'WebhookEvent' 
        AND indexname = 'WebhookEvent_status_retryAt_idx'
    ) THEN
        CREATE INDEX "WebhookEvent_status_retryAt_idx" 
        ON "public"."WebhookEvent"("status", "retryAt");
        
        RAISE NOTICE 'Created index WebhookEvent_status_retryAt_idx';
    ELSE
        RAISE NOTICE 'Index WebhookEvent_status_retryAt_idx already exists, skipping';
    END IF;
END $$;

-- Index for webhook statistics by provider and event type
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'WebhookEvent' 
        AND indexname = 'WebhookEvent_provider_eventType_idx'
    ) THEN
        CREATE INDEX "WebhookEvent_provider_eventType_idx" 
        ON "public"."WebhookEvent"("provider", "eventType");
        
        RAISE NOTICE 'Created index WebhookEvent_provider_eventType_idx';
    ELSE
        RAISE NOTICE 'Index WebhookEvent_provider_eventType_idx already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- Step 3: Update existing failed webhooks to set initial retry time
-- ============================================================================

-- Set retryAt for existing failed webhooks (1 minute from now)
UPDATE "public"."WebhookEvent"
SET "retryAt" = NOW() + INTERVAL '1 minute'
WHERE "status" = 'failed' 
  AND "retryAt" IS NULL
  AND "attempts" < 5;

-- Get count of updated records
DO $$ 
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % failed webhooks with retry time', updated_count;
END $$;

-- ============================================================================
-- Verification: Check the changes
-- ============================================================================

-- Verify columns exist
DO $$ 
DECLARE
    attempts_exists BOOLEAN;
    retryAt_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'WebhookEvent' 
        AND column_name = 'attempts'
    ) INTO attempts_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'WebhookEvent' 
        AND column_name = 'retryAt'
    ) INTO retryAt_exists;
    
    IF attempts_exists AND retryAt_exists THEN
        RAISE NOTICE '✓ Verification: All columns created successfully';
    ELSE
        RAISE EXCEPTION '✗ Verification failed: Missing columns';
    END IF;
END $$;

-- Verify indexes exist
DO $$ 
DECLARE
    status_retry_idx_exists BOOLEAN;
    provider_event_idx_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'WebhookEvent' 
        AND indexname = 'WebhookEvent_status_retryAt_idx'
    ) INTO status_retry_idx_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'WebhookEvent' 
        AND indexname = 'WebhookEvent_provider_eventType_idx'
    ) INTO provider_event_idx_exists;
    
    IF status_retry_idx_exists AND provider_event_idx_exists THEN
        RAISE NOTICE '✓ Verification: All indexes created successfully';
    ELSE
        RAISE EXCEPTION '✗ Verification failed: Missing indexes';
    END IF;
END $$;

-- Display final table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'WebhookEvent'
ORDER BY ordinal_position;

-- Display indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'WebhookEvent'
ORDER BY indexname;

-- Commit the transaction
COMMIT;

-- ============================================================================
-- Success!
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Deploy updated application code';
    RAISE NOTICE '2. Monitor webhook processing';
    RAISE NOTICE '3. Check webhook stats: npm run webhook:stats';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================
-- 
-- If you need to rollback this migration, run:
-- 
-- BEGIN;
-- DROP INDEX IF EXISTS "public"."WebhookEvent_status_retryAt_idx";
-- DROP INDEX IF EXISTS "public"."WebhookEvent_provider_eventType_idx";
-- ALTER TABLE "public"."WebhookEvent" DROP COLUMN IF EXISTS "retryAt";
-- ALTER TABLE "public"."WebhookEvent" DROP COLUMN IF EXISTS "attempts";
-- COMMIT;
-- 
-- ============================================================================
