-- =====================================================
-- VERIFICATION SCRIPT FOR PRODUCTION DATABASE
-- =====================================================
-- Run this to check what exists in production

-- 1. Check which workspace tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('Workspace', 'WorkspaceMember', 'WorkspaceInvite', 'WorkspaceProject') 
        THEN '✓ EXISTS' 
        ELSE '✗ MISSING' 
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('Workspace', 'WorkspaceMember', 'WorkspaceInvite', 'WorkspaceProject')
ORDER BY table_name;

-- 2. Check User table has promo code fields
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'User'
AND column_name IN ('promoCodeUsed', 'discountRate')
ORDER BY column_name;

-- 3. Check PromoCodes table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'PromoCodes'
AND column_name IN ('validUntil', 'discountType', 'discountValue')
ORDER BY column_name;

-- 4. Check if _prisma_migrations table has workspace migration
SELECT 
    migration_name,
    finished_at,
    applied_steps_count
FROM _prisma_migrations
WHERE migration_name LIKE '%workspace%'
ORDER BY finished_at DESC;

-- 5. Count workspace-related records
DO $$
DECLARE
    workspace_count INTEGER := 0;
    member_count INTEGER := 0;
    invite_count INTEGER := 0;
    project_count INTEGER := 0;
BEGIN
    -- Only count if tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Workspace') THEN
        SELECT COUNT(*) INTO workspace_count FROM "Workspace";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'WorkspaceMember') THEN
        SELECT COUNT(*) INTO member_count FROM "WorkspaceMember";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'WorkspaceInvite') THEN
        SELECT COUNT(*) INTO invite_count FROM "WorkspaceInvite";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'WorkspaceProject') THEN
        SELECT COUNT(*) INTO project_count FROM "WorkspaceProject";
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Workspace Records: %', workspace_count;
    RAISE NOTICE 'Member Records: %', member_count;
    RAISE NOTICE 'Invite Records: %', invite_count;
    RAISE NOTICE 'Project Records: %', project_count;
    RAISE NOTICE '========================================';
END $$;
