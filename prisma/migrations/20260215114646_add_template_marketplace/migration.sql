-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "public"."TemplateStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "public"."TemplateTier" AS ENUM ('FREE', 'PRO', 'COLLECTION');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable: Template
CREATE TABLE IF NOT EXISTS "public"."Template" (
    "id"          TEXT NOT NULL,
    "creatorId"   TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category"    TEXT NOT NULL,
    "tier"        "public"."TemplateTier" NOT NULL DEFAULT 'FREE',
    "price"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "thumbnail"   TEXT,
    "htmlCode"    TEXT NOT NULL,
    "cssCode"     TEXT,
    "jsCode"      TEXT,
    "status"      "public"."TemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "downloads"   INTEGER NOT NULL DEFAULT 0,
    "views"       INTEGER NOT NULL DEFAULT 0,
    "rating"      DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "tags"        TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TemplatePurchase
CREATE TABLE IF NOT EXISTS "public"."TemplatePurchase" (
    "id"          TEXT NOT NULL,
    "templateId"  TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "price"       DOUBLE PRECISION NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplatePurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TemplateRevenue
CREATE TABLE IF NOT EXISTS "public"."TemplateRevenue" (
    "id"              TEXT NOT NULL,
    "templateId"      TEXT NOT NULL,
    "creatorId"       TEXT NOT NULL,
    "amount"          DOUBLE PRECISION NOT NULL,
    "platformShare"   DOUBLE PRECISION NOT NULL,
    "creatorShare"    DOUBLE PRECISION NOT NULL,
    "stripePaymentId" TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidOut"         BOOLEAN NOT NULL DEFAULT false,
    "paidOutAt"       TIMESTAMP(3),

    CONSTRAINT "TemplateRevenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TemplateReview
CREATE TABLE IF NOT EXISTS "public"."TemplateReview" (
    "id"         TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "rating"     INTEGER NOT NULL,
    "comment"    TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateReview_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
ALTER TABLE "public"."TemplatePurchase"
  ADD CONSTRAINT IF NOT EXISTS "TemplatePurchase_templateId_userId_key" UNIQUE ("templateId", "userId");

ALTER TABLE "public"."TemplateReview"
  ADD CONSTRAINT IF NOT EXISTS "TemplateReview_templateId_userId_key" UNIQUE ("templateId", "userId");

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "public"."Template"
    ADD CONSTRAINT "Template_creatorId_fkey"
    FOREIGN KEY ("creatorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."TemplatePurchase"
    ADD CONSTRAINT "TemplatePurchase_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "public"."Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."TemplatePurchase"
    ADD CONSTRAINT "TemplatePurchase_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."TemplateRevenue"
    ADD CONSTRAINT "TemplateRevenue_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "public"."Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."TemplateRevenue"
    ADD CONSTRAINT "TemplateRevenue_creatorId_fkey"
    FOREIGN KEY ("creatorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."TemplateReview"
    ADD CONSTRAINT "TemplateReview_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "public"."Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."TemplateReview"
    ADD CONSTRAINT "TemplateReview_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "Template_category_idx"    ON "public"."Template"("category");
CREATE INDEX IF NOT EXISTS "Template_creatorId_idx"   ON "public"."Template"("creatorId");
CREATE INDEX IF NOT EXISTS "Template_status_idx"      ON "public"."Template"("status");
CREATE INDEX IF NOT EXISTS "Template_tier_idx"        ON "public"."Template"("tier");
CREATE INDEX IF NOT EXISTS "TemplatePurchase_templateId_idx" ON "public"."TemplatePurchase"("templateId");
CREATE INDEX IF NOT EXISTS "TemplatePurchase_userId_idx"     ON "public"."TemplatePurchase"("userId");
CREATE INDEX IF NOT EXISTS "TemplateRevenue_creatorId_idx"   ON "public"."TemplateRevenue"("creatorId");
CREATE INDEX IF NOT EXISTS "TemplateRevenue_paidOut_idx"     ON "public"."TemplateRevenue"("paidOut");
CREATE INDEX IF NOT EXISTS "TemplateRevenue_templateId_idx"  ON "public"."TemplateRevenue"("templateId");
CREATE INDEX IF NOT EXISTS "TemplateReview_templateId_idx"   ON "public"."TemplateReview"("templateId");
CREATE INDEX IF NOT EXISTS "TemplateReview_userId_idx"       ON "public"."TemplateReview"("userId");
