-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "public"."PreviewStatus" AS ENUM ('DEPLOYING', 'READY', 'ERROR', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "public"."Project" 
ADD COLUMN IF NOT EXISTS "projectType" TEXT DEFAULT 'single-html',
ADD COLUMN IF NOT EXISTS "isMultiFile" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "setupInstructions" JSONB,
ADD COLUMN IF NOT EXISTS "dependencies" JSONB,
ADD COLUMN IF NOT EXISTS "devDependencies" JSONB,
ADD COLUMN IF NOT EXISTS "envVars" JSONB;

-- CreateTable
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."ProjectFile" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "language" TEXT DEFAULT 'typescript',
  "order" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "ProjectFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."ProjectVersion" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "code" TEXT NOT NULL,
  "prompt" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  
  CONSTRAINT "ProjectVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Preview_deploymentId_key" ON "public"."Preview"("deploymentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Preview_projectId_idx" ON "public"."Preview"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Preview_expiresAt_idx" ON "public"."Preview"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Preview_status_idx" ON "public"."Preview"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectFile_projectId_path_key" ON "public"."ProjectFile"("projectId", "path");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectFile_projectId_idx" ON "public"."ProjectFile"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectFile_language_idx" ON "public"."ProjectFile"("language");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectVersion_projectId_idx" ON "public"."ProjectVersion"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectVersion_createdAt_idx" ON "public"."ProjectVersion"("createdAt");

-- AddForeignKey
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

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "public"."ProjectFile"
    ADD CONSTRAINT "ProjectFile_projectId_fkey" 
    FOREIGN KEY ("projectId") 
    REFERENCES "public"."Project"("id") 
    ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "public"."ProjectVersion"
    ADD CONSTRAINT "ProjectVersion_projectId_fkey" 
    FOREIGN KEY ("projectId") 
    REFERENCES "public"."Project"("id") 
    ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
