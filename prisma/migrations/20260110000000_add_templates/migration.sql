-- CreateEnum for template pricing tiers
CREATE TYPE "TemplateTier" AS ENUM ('FREE', 'PRO', 'COLLECTION');

-- CreateEnum for template status
CREATE TYPE "TemplateStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- Template marketplace table
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tier" "TemplateTier" NOT NULL DEFAULT 'FREE',
    "price" DECIMAL(10,2) DEFAULT 0,
    "status" "TemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "thumbnail" TEXT,
    "previewUrl" TEXT,
    "html" TEXT NOT NULL,
    "css" TEXT,
    "javascript" TEXT,
    "category" TEXT,
    "tags" TEXT[],
    "downloads" INTEGER DEFAULT 0,
    "views" INTEGER DEFAULT 0,
    "rating" DECIMAL(3,2) DEFAULT 0,
    "reviewCount" INTEGER DEFAULT 0,
    "isUserCreated" BOOLEAN DEFAULT false,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- Template purchases table
CREATE TABLE "TemplatePurchase" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "stripePaymentId" TEXT,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplatePurchase_pkey" PRIMARY KEY ("id")
);

-- Template revenue share for user-created templates
CREATE TABLE "TemplateRevenue" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "totalRevenue" DECIMAL(10,2) DEFAULT 0,
    "creatorShare" DECIMAL(10,2) DEFAULT 0,
    "platformShare" DECIMAL(10,2) DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateRevenue_pkey" PRIMARY KEY ("id")
);

-- Template reviews
CREATE TABLE "TemplateReview" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateReview_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "Template_creatorId_idx" ON "Template"("creatorId");
CREATE INDEX "Template_status_idx" ON "Template"("status");
CREATE INDEX "Template_tier_idx" ON "Template"("tier");
CREATE INDEX "Template_category_idx" ON "Template"("category");
CREATE INDEX "TemplatePurchase_userId_idx" ON "TemplatePurchase"("userId");
CREATE INDEX "TemplatePurchase_templateId_idx" ON "TemplatePurchase"("templateId");
CREATE INDEX "TemplateRevenue_templateId_idx" ON "TemplateRevenue"("templateId");
CREATE INDEX "TemplateReview_templateId_idx" ON "TemplateReview"("templateId");

-- Foreign keys
ALTER TABLE "Template" ADD CONSTRAINT "Template_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TemplatePurchase" ADD CONSTRAINT "TemplatePurchase_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TemplatePurchase" ADD CONSTRAINT "TemplatePurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TemplateRevenue" ADD CONSTRAINT "TemplateRevenue_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TemplateRevenue" ADD CONSTRAINT "TemplateRevenue_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TemplateReview" ADD CONSTRAINT "TemplateReview_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TemplateReview" ADD CONSTRAINT "TemplateReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Unique constraints
CREATE UNIQUE INDEX "TemplatePurchase_userId_templateId_key" ON "TemplatePurchase"("userId", "templateId");
CREATE UNIQUE INDEX "TemplateRevenue_templateId_key" ON "TemplateRevenue"("templateId");
CREATE UNIQUE INDEX "TemplateReview_userId_templateId_key" ON "TemplateReview"("userId", "templateId");
