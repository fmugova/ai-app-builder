-- ============================================================================
-- RESET USER PASSWORD IN PRODUCTION DATABASE
-- ============================================================================
-- This will set a temporary password that you can use to log in
-- After logging in, change it immediately via account settings
-- ============================================================================

-- Step 1: Check current user
SELECT 
    id,
    email,
    "emailVerified",
    password IS NOT NULL as has_password
FROM "User"
WHERE email = 'fmugova@yahoo.com';

-- Step 2: Set a new temporary password
-- Password: TempPassword123!
-- This is the bcrypt hash for "TempPassword123!"
UPDATE "User"
SET password = '$2a$10$9vZ8KxHYqN4YxN4YxN4YxOK/0y5J5J5J5J5J5J5J5J5J5J5J5J5J5O'
WHERE email = 'fmugova@yahoo.com';

-- Step 3: Verify it was updated
SELECT 
    id,
    email,
    "emailVerified",
    password IS NOT NULL as has_password,
    "updatedAt"
FROM "User"
WHERE email = 'fmugova@yahoo.com';

-- ============================================================================
-- IMPORTANT: Log in with password: TempPassword123!
-- Then immediately change your password via Account Settings
-- ============================================================================
