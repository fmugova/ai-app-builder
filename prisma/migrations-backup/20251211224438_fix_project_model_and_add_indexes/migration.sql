/*
  Warnings:

  - You are about to drop the column `description` on the `Generation` table. All the data in the column will be lost.
  - You are about to drop the column `projectType` on the `Generation` table. All the data in the column will be lost.
  - You are about to drop the column `tokensUsed` on the `Generation` table. All the data in the column will be lost.
  - You are about to drop the column `generationsLimit` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `generationsUsed` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCurrentPeriodEnd` on the `Subscription` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[shareToken]` on the table `Project` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeCustomerId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeSubscriptionId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `Generation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prompt` to the `Generation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Generation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Generation" DROP COLUMN "description",
DROP COLUMN "projectType",
DROP COLUMN "tokensUsed",
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "prompt" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "downloads" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "framework" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "prompt" TEXT,
ADD COLUMN     "shareToken" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "description" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "generationsLimit",
DROP COLUMN "generationsUsed",
DROP COLUMN "stripeCurrentPeriodEnd",
ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "stripeCustomerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "autoSave" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "discountRate" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "generationsLimit" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "generationsUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "githubAccessToken" TEXT,
ADD COLUMN     "githubUsername" TEXT,
ADD COLUMN     "notifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "projectsLimit" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "projectsThisMonth" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "promoCodeUsed" TEXT,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user',
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "subscriptionResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "subscriptionStatus" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "subscriptionTier" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'light',
ALTER COLUMN "password" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ProjectVersion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "ProjectVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectShare" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sharedWith" TEXT NOT NULL,
    "permission" TEXT NOT NULL DEFAULT 'view',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ProjectShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "maxUses" INTEGER NOT NULL,
    "timesUsed" INTEGER NOT NULL DEFAULT 0,
    "validUntil" TIMESTAMP(3),
    "applicableTo" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "event" TEXT NOT NULL,
    "properties" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectVersion_projectId_idx" ON "ProjectVersion"("projectId");

-- CreateIndex
CREATE INDEX "ProjectVersion_userId_idx" ON "ProjectVersion"("userId");

-- CreateIndex
CREATE INDEX "Activity_createdAt_idx" ON "Activity"("createdAt");

-- CreateIndex
CREATE INDEX "Activity_userId_idx" ON "Activity"("userId");

-- CreateIndex
CREATE INDEX "Feedback_userId_idx" ON "Feedback"("userId");

-- CreateIndex
CREATE INDEX "Feedback_status_idx" ON "Feedback"("status");

-- CreateIndex
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");

-- CreateIndex
CREATE INDEX "ProjectShare_projectId_idx" ON "ProjectShare"("projectId");

-- CreateIndex
CREATE INDEX "ProjectShare_sharedWith_idx" ON "ProjectShare"("sharedWith");

-- CreateIndex
CREATE UNIQUE INDEX "promo_codes_code_key" ON "promo_codes"("code");

-- CreateIndex
CREATE INDEX "promo_codes_code_idx" ON "promo_codes"("code");

-- CreateIndex
CREATE INDEX "promo_codes_active_idx" ON "promo_codes"("active");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_event_idx" ON "AnalyticsEvent"("event");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_userId_idx" ON "AnalyticsEvent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_shareToken_key" ON "Project"("shareToken");

-- CreateIndex
CREATE INDEX "Project_shareToken_idx" ON "Project"("shareToken");

-- CreateIndex
CREATE INDEX "Project_isPublic_idx" ON "Project"("isPublic");

-- CreateIndex
CREATE INDEX "Project_updatedAt_idx" ON "Project"("updatedAt");

-- CreateIndex
CREATE INDEX "Project_userId_updatedAt_idx" ON "Project"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Subscription_stripeSubscriptionId_idx" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeSubscriptionId_key" ON "User"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "ProjectVersion" ADD CONSTRAINT "ProjectVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectVersion" ADD CONSTRAINT "ProjectVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectShare" ADD CONSTRAINT "ProjectShare_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectShare" ADD CONSTRAINT "ProjectShare_sharedWith_fkey" FOREIGN KEY ("sharedWith") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
