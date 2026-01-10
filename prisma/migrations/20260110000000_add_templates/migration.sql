-- CreateEnum for template pricing tiers
CREATE TYPE "public"."TemplateTier" AS ENUM ('FREE', 'PRO', 'COLLECTION');

-- CreateEnum for template status
CREATE TYPE "public"."TemplateStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- Template marketplace table
CREATE TABLE "public"."Template" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tier" "public"."TemplateTier" NOT NULL DEFAULT 'FREE',
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "thumbnail" TEXT,
    "htmlCode" TEXT NOT NULL,
    "cssCode" TEXT,
    "jsCode" TEXT,
    "status" "public"."TemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- Template purchases table
CREATE TABLE "public"."TemplatePurchase" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplatePurchase_pkey" PRIMARY KEY ("id")
);

-- Template revenue share for user-created templates
CREATE TABLE "public"."TemplateRevenue" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "platformShare" DOUBLE PRECISION NOT NULL,
    "creatorShare" DOUBLE PRECISION NOT NULL,
    "stripePaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidOut" BOOLEAN NOT NULL DEFAULT false,
    "paidOutAt" TIMESTAMP(3),

    CONSTRAINT "TemplateRevenue_pkey" PRIMARY KEY ("id")
);

-- Template reviews
CREATE TABLE "public"."TemplateReview" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateReview_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "Template_creatorId_idx" ON "public"."Template"("creatorId");
CREATE INDEX "Template_status_idx" ON "public"."Template"("status");
CREATE INDEX "Template_tier_idx" ON "public"."Template"("tier");
CREATE INDEX "Template_category_idx" ON "public"."Template"("category");
CREATE INDEX "TemplatePurchase_userId_idx" ON "public"."TemplatePurchase"("userId");
CREATE INDEX "TemplatePurchase_templateId_idx" ON "public"."TemplatePurchase"("templateId");
CREATE INDEX "TemplateRevenue_creatorId_idx" ON "public"."TemplateRevenue"("creatorId");
CREATE INDEX "TemplateRevenue_templateId_idx" ON "public"."TemplateRevenue"("templateId");
CREATE INDEX "TemplateRevenue_paidOut_idx" ON "public"."TemplateRevenue"("paidOut");
CREATE INDEX "TemplateReview_templateId_idx" ON "public"."TemplateReview"("templateId");
CREATE INDEX "TemplateReview_userId_idx" ON "public"."TemplateReview"("userId");

-- Foreign keys
ALTER TABLE "public"."Template" ADD CONSTRAINT "Template_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."TemplatePurchase" ADD CONSTRAINT "TemplatePurchase_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."TemplatePurchase" ADD CONSTRAINT "TemplatePurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."TemplateRevenue" ADD CONSTRAINT "TemplateRevenue_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."TemplateRevenue" ADD CONSTRAINT "TemplateRevenue_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."TemplateReview" ADD CONSTRAINT "TemplateReview_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."TemplateReview" ADD CONSTRAINT "TemplateReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Unique constraints
CREATE UNIQUE INDEX "TemplatePurchase_templateId_userId_key" ON "public"."TemplatePurchase"("templateId", "userId");
CREATE UNIQUE INDEX "TemplateReview_templateId_userId_key" ON "public"."TemplateReview"("templateId", "userId");
