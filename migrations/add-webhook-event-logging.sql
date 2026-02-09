-- Migration: Add Webhook Event Logging
-- Run this SQL directly in your production database
-- Date: 2026-02-08

-- Create WebhookEvent table for logging all webhook events
CREATE TABLE IF NOT EXISTS "public"."WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventId" TEXT,
    "payload" JSONB NOT NULL,
    "metadata" JSONB,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS "WebhookEvent_provider_idx" ON "public"."WebhookEvent"("provider");
CREATE INDEX IF NOT EXISTS "WebhookEvent_eventType_idx" ON "public"."WebhookEvent"("eventType");
CREATE INDEX IF NOT EXISTS "WebhookEvent_eventId_idx" ON "public"."WebhookEvent"("eventId");
CREATE INDEX IF NOT EXISTS "WebhookEvent_userId_idx" ON "public"."WebhookEvent"("userId");
CREATE INDEX IF NOT EXISTS "WebhookEvent_status_idx" ON "public"."WebhookEvent"("status");
CREATE INDEX IF NOT EXISTS "WebhookEvent_createdAt_idx" ON "public"."WebhookEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "WebhookEvent_provider_eventId_idx" ON "public"."WebhookEvent"("provider", "eventId");

-- Verify the table was created
SELECT 
    'WebhookEvent table created' as status,
    COUNT(*) as record_count 
FROM "public"."WebhookEvent";

-- Display table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'WebhookEvent'
ORDER BY ordinal_position;

-- Success message
SELECT '✅ Webhook event logging migration completed successfully!' as message;
