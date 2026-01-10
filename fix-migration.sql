-- Fix the baseline migration that has 0 applied steps
-- Run this in your Supabase SQL Editor

UPDATE "_prisma_migrations" 
SET applied_steps_count = 1,
    logs = 'Migration fixed: marked as successfully applied'
WHERE migration_name = '20260110181255_baseline' 
  AND id = 'f5f66a10-c42c-420e-9cbc-34e88b4b04a0';

-- Verify the fix
SELECT 
    migration_name,
    applied_steps_count,
    started_at,
    finished_at,
    logs
FROM "_prisma_migrations" 
WHERE migration_name = '20260110181255_baseline';
