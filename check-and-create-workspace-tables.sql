-- =====================================================
-- WORKSPACE TABLES CHECKER AND CREATOR FOR PRODUCTION
-- =====================================================
-- This script checks if workspace tables exist and creates them if needed
-- Run this directly in your production PostgreSQL database

-- Check if tables exist
DO $$
BEGIN
    -- Check Workspace table
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Workspace'
    ) THEN
        RAISE NOTICE 'Workspace table does NOT exist - will create';
    ELSE
        RAISE NOTICE 'Workspace table exists';
    END IF;

    -- Check WorkspaceMember table
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'WorkspaceMember'
    ) THEN
        RAISE NOTICE 'WorkspaceMember table does NOT exist - will create';
    ELSE
        RAISE NOTICE 'WorkspaceMember table exists';
    END IF;

    -- Check WorkspaceInvite table
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'WorkspaceInvite'
    ) THEN
        RAISE NOTICE 'WorkspaceInvite table does NOT exist - will create';
    ELSE
        RAISE NOTICE 'WorkspaceInvite table exists';
    END IF;

    -- Check WorkspaceProject table
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'WorkspaceProject'
    ) THEN
        RAISE NOTICE 'WorkspaceProject table does NOT exist - will create';
    ELSE
        RAISE NOTICE 'WorkspaceProject table exists';
    END IF;
END $$;

-- =====================================================
-- CREATE TABLES IF THEY DON'T EXIST
-- =====================================================

-- CreateTable: Workspace
CREATE TABLE IF NOT EXISTS "public"."Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'free',
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'active',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "generationsUsed" INTEGER NOT NULL DEFAULT 0,
    "generationsLimit" INTEGER NOT NULL DEFAULT 50,
    "projectsLimit" INTEGER NOT NULL DEFAULT 10,
    "membersLimit" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WorkspaceMember
CREATE TABLE IF NOT EXISTS "public"."WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WorkspaceInvite
CREATE TABLE IF NOT EXISTS "public"."WorkspaceInvite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "invitedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WorkspaceProject
CREATE TABLE IF NOT EXISTS "public"."WorkspaceProject" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedBy" TEXT NOT NULL,

    CONSTRAINT "WorkspaceProject_pkey" PRIMARY KEY ("id")
);

-- =====================================================
-- CREATE UNIQUE CONSTRAINTS (only if table was created)
-- =====================================================

DO $$
BEGIN
    -- Workspace slug unique constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Workspace_slug_key'
    ) THEN
        ALTER TABLE "public"."Workspace" ADD CONSTRAINT "Workspace_slug_key" UNIQUE ("slug");
        RAISE NOTICE 'Created unique constraint: Workspace_slug_key';
    END IF;

    -- Workspace stripeCustomerId unique constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Workspace_stripeCustomerId_key'
    ) THEN
        ALTER TABLE "public"."Workspace" ADD CONSTRAINT "Workspace_stripeCustomerId_key" UNIQUE ("stripeCustomerId");
        RAISE NOTICE 'Created unique constraint: Workspace_stripeCustomerId_key';
    END IF;

    -- Workspace stripeSubscriptionId unique constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Workspace_stripeSubscriptionId_key'
    ) THEN
        ALTER TABLE "public"."Workspace" ADD CONSTRAINT "Workspace_stripeSubscriptionId_key" UNIQUE ("stripeSubscriptionId");
        RAISE NOTICE 'Created unique constraint: Workspace_stripeSubscriptionId_key';
    END IF;

    -- WorkspaceMember unique constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'WorkspaceMember_workspaceId_userId_key'
    ) THEN
        ALTER TABLE "public"."WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_userId_key" UNIQUE ("workspaceId", "userId");
        RAISE NOTICE 'Created unique constraint: WorkspaceMember_workspaceId_userId_key';
    END IF;

    -- WorkspaceInvite token unique constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'WorkspaceInvite_token_key'
    ) THEN
        ALTER TABLE "public"."WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_token_key" UNIQUE ("token");
        RAISE NOTICE 'Created unique constraint: WorkspaceInvite_token_key';
    END IF;

    -- WorkspaceInvite unique email per workspace constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'WorkspaceInvite_workspaceId_email_key'
    ) THEN
        ALTER TABLE "public"."WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_workspaceId_email_key" UNIQUE ("workspaceId", "email");
        RAISE NOTICE 'Created unique constraint: WorkspaceInvite_workspaceId_email_key';
    END IF;

    -- WorkspaceProject unique constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'WorkspaceProject_workspaceId_projectId_key'
    ) THEN
        ALTER TABLE "public"."WorkspaceProject" ADD CONSTRAINT "WorkspaceProject_workspaceId_projectId_key" UNIQUE ("workspaceId", "projectId");
        RAISE NOTICE 'Created unique constraint: WorkspaceProject_workspaceId_projectId_key';
    END IF;
END $$;

-- =====================================================
-- CREATE INDEXES
-- =====================================================

DO $$
BEGIN
    -- WorkspaceMember indexes
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'WorkspaceMember_userId_idx'
    ) THEN
        CREATE INDEX "WorkspaceMember_userId_idx" ON "public"."WorkspaceMember"("userId");
        RAISE NOTICE 'Created index: WorkspaceMember_userId_idx';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'WorkspaceMember_workspaceId_idx'
    ) THEN
        CREATE INDEX "WorkspaceMember_workspaceId_idx" ON "public"."WorkspaceMember"("workspaceId");
        RAISE NOTICE 'Created index: WorkspaceMember_workspaceId_idx';
    END IF;

    -- WorkspaceInvite indexes
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'WorkspaceInvite_email_idx'
    ) THEN
        CREATE INDEX "WorkspaceInvite_email_idx" ON "public"."WorkspaceInvite"("email");
        RAISE NOTICE 'Created index: WorkspaceInvite_email_idx';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'WorkspaceInvite_workspaceId_idx'
    ) THEN
        CREATE INDEX "WorkspaceInvite_workspaceId_idx" ON "public"."WorkspaceInvite"("workspaceId");
        RAISE NOTICE 'Created index: WorkspaceInvite_workspaceId_idx';
    END IF;

    -- WorkspaceProject indexes
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'WorkspaceProject_projectId_idx'
    ) THEN
        CREATE INDEX "WorkspaceProject_projectId_idx" ON "public"."WorkspaceProject"("projectId");
        RAISE NOTICE 'Created index: WorkspaceProject_projectId_idx';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'WorkspaceProject_workspaceId_idx'
    ) THEN
        CREATE INDEX "WorkspaceProject_workspaceId_idx" ON "public"."WorkspaceProject"("workspaceId");
        RAISE NOTICE 'Created index: WorkspaceProject_workspaceId_idx';
    END IF;
END $$;

-- =====================================================
-- ADD FOREIGN KEY CONSTRAINTS
-- =====================================================

DO $$
BEGIN
    -- WorkspaceMember foreign keys
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'WorkspaceMember_userId_fkey'
    ) THEN
        ALTER TABLE "public"."WorkspaceMember" 
        ADD CONSTRAINT "WorkspaceMember_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Created foreign key: WorkspaceMember_userId_fkey';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'WorkspaceMember_workspaceId_fkey'
    ) THEN
        ALTER TABLE "public"."WorkspaceMember" 
        ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" 
        FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Created foreign key: WorkspaceMember_workspaceId_fkey';
    END IF;

    -- WorkspaceInvite foreign keys
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'WorkspaceInvite_invitedBy_fkey'
    ) THEN
        ALTER TABLE "public"."WorkspaceInvite" 
        ADD CONSTRAINT "WorkspaceInvite_invitedBy_fkey" 
        FOREIGN KEY ("invitedBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Created foreign key: WorkspaceInvite_invitedBy_fkey';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'WorkspaceInvite_workspaceId_fkey'
    ) THEN
        ALTER TABLE "public"."WorkspaceInvite" 
        ADD CONSTRAINT "WorkspaceInvite_workspaceId_fkey" 
        FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Created foreign key: WorkspaceInvite_workspaceId_fkey';
    END IF;

    -- WorkspaceProject foreign keys
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'WorkspaceProject_addedBy_fkey'
    ) THEN
        ALTER TABLE "public"."WorkspaceProject" 
        ADD CONSTRAINT "WorkspaceProject_addedBy_fkey" 
        FOREIGN KEY ("addedBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Created foreign key: WorkspaceProject_addedBy_fkey';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'WorkspaceProject_projectId_fkey'
    ) THEN
        ALTER TABLE "public"."WorkspaceProject" 
        ADD CONSTRAINT "WorkspaceProject_projectId_fkey" 
        FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Created foreign key: WorkspaceProject_projectId_fkey';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'WorkspaceProject_workspaceId_fkey'
    ) THEN
        ALTER TABLE "public"."WorkspaceProject" 
        ADD CONSTRAINT "WorkspaceProject_workspaceId_fkey" 
        FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Created foreign key: WorkspaceProject_workspaceId_fkey';
    END IF;
END $$;

-- =====================================================
-- FINAL CHECK
-- =====================================================

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('Workspace', 'WorkspaceMember', 'WorkspaceInvite', 'WorkspaceProject');
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Workspace tables created: % of 4', table_count;
    RAISE NOTICE '========================================';
    
    IF table_count = 4 THEN
        RAISE NOTICE 'SUCCESS: All workspace tables are ready!';
        RAISE NOTICE 'Next step: Mark migration as applied in Prisma';
        RAISE NOTICE 'Run locally: npx prisma migrate resolve --applied 20260107205122_add_workspace_feature';
    ELSE
        RAISE WARNING 'Some tables may be missing. Please check manually.';
    END IF;
END $$;
