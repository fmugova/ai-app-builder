-- ============================================================================
-- VERIFY USER EMAIL IN PRODUCTION DATABASE
-- ============================================================================
-- Run this in your Supabase SQL Editor to verify your email
-- Replace 'your-email@example.com' with your actual email
-- ============================================================================

-- Step 1: Check current user status
SELECT 
    id,
    email,
    "emailVerified",
    "twoFactorEnabled",
    "createdAt"
FROM "User"
WHERE email = 'your-email@example.com';

-- Step 2: Verify the email (set emailVerified to current timestamp)
UPDATE "User"
SET "emailVerified" = NOW()
WHERE email = 'your-email@example.com'
AND "emailVerified" IS NULL;

-- Step 3: Verify it worked
SELECT 
    id,
    email,
    "emailVerified",
    "twoFactorEnabled",
    "createdAt"
FROM "User"
WHERE email = 'your-email@example.com';

-- ============================================================================
-- After running this, you should be able to log in
-- If you have 2FA enabled, make sure you have your authenticator app ready
-- ============================================================================
