-- CreateTable
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
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "retryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookEvent_createdAt_idx" ON "public"."WebhookEvent"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookEvent_eventId_idx" ON "public"."WebhookEvent"("eventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookEvent_eventType_idx" ON "public"."WebhookEvent"("eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookEvent_provider_eventId_idx" ON "public"."WebhookEvent"("provider", "eventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookEvent_provider_idx" ON "public"."WebhookEvent"("provider");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookEvent_status_idx" ON "public"."WebhookEvent"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookEvent_userId_idx" ON "public"."WebhookEvent"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookEvent_status_retryAt_idx" ON "public"."WebhookEvent"("status", "retryAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookEvent_provider_eventType_idx" ON "public"."WebhookEvent"("provider", "eventType");
