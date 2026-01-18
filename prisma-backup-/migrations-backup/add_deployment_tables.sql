-- Migration: Add Deployment and VercelConnection tables (Phase 3 Enhanced)
-- Date: 2025-12-21
-- Description: Creates tables for tracking deployments and Vercel integrations with full OAuth support

-- Create VercelConnection table
CREATE TABLE IF NOT EXISTS "VercelConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "teamId" TEXT,
    "configurationId" TEXT,
    "username" TEXT,
    "email" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VercelConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create Deployment table
CREATE TABLE IF NOT EXISTS "Deployment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'vercel',
    "deploymentUrl" TEXT,
    "deploymentId" TEXT,
    "vercelProjectId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "logs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Deployment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Deployment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for VercelConnection table
CREATE INDEX IF NOT EXISTS "VercelConnection_userId_idx" ON "VercelConnection"("userId");

-- Create indexes for Deployment table
CREATE INDEX IF NOT EXISTS "Deployment_projectId_idx" ON "Deployment"("projectId");
CREATE INDEX IF NOT EXISTS "Deployment_userId_idx" ON "Deployment"("userId");
CREATE INDEX IF NOT EXISTS "Deployment_status_idx" ON "Deployment"("status");
CREATE INDEX IF NOT EXISTS "Deployment_deploymentId_idx" ON "Deployment"("deploymentId");

-- Verify tables were created
SELECT 'VercelConnection table created' AS status WHERE EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'VercelConnection'
);

SELECT 'Deployment table created' AS status WHERE EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'Deployment'
);
