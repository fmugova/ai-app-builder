-- Add multi-file project columns to Project table
-- Run this in Supabase SQL Editor

ALTER TABLE public."Project" 
ADD COLUMN IF NOT EXISTS "projectType" TEXT DEFAULT 'single-html',
ADD COLUMN IF NOT EXISTS "isMultiFile" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "setupInstructions" JSONB,
ADD COLUMN IF NOT EXISTS "dependencies" JSONB,
ADD COLUMN IF NOT EXISTS "devDependencies" JSONB,
ADD COLUMN IF NOT EXISTS "envVars" JSONB;

-- Create ProjectFile table
CREATE TABLE IF NOT EXISTS public."ProjectFile" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "language" TEXT DEFAULT 'typescript',
  "order" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"("id") ON DELETE CASCADE,
  CONSTRAINT "ProjectFile_projectId_path_key" UNIQUE ("projectId", "path")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "ProjectFile_projectId_idx" ON public."ProjectFile"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectFile_language_idx" ON public."ProjectFile"("language");
