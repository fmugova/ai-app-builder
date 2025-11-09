# Database Migration Guide

## Issue
The production database is missing several columns and tables that were added to the Prisma schema, causing 500 errors:
- `Project.isPublic` column
- `Project.shareToken` column
- `ProjectVersion` table
- `AnalyticsEvent` table

## Solution
A migration has been created to add these missing database components.

## ⚠️ IMPORTANT: Build vs Migration

To avoid build timeouts, **migrations are NOT run during the build**. You must run them separately after deployment succeeds.

## How to Apply the Migration

### ✅ Option 1: Direct Database Connection (FASTEST - Recommended)
Connect to your PostgreSQL database and run:
```sql
-- File: prisma/migrations/20251109_add_sharing_and_analytics/migration.sql
-- Copy the SQL from this file and execute it
```

You can use:
- **TablePlus**, **pgAdmin**, **DBeaver**, or any PostgreSQL client
- Connect using your `DATABASE_URL` from Vercel environment variables

### Option 2: Using Vercel CLI
```bash
# Pull environment variables
vercel env pull .env.local

# Run migration (requires local setup)
npm run db:migrate
```

### Option 3: Using Prisma DB Push (Development Only)
```bash
npm run db:push
```
⚠️ This syncs schema directly - use only for development

## For Vercel Deployment

### 1️⃣ First: Let Build Complete Successfully
The build script is optimized to avoid timeouts:
```json
"build": "prisma generate && next build"
```

This does NOT run migrations during build (which was causing 45-minute timeouts).

### 2️⃣ After Deployment: Run Migration

**Get your DATABASE_URL:**
1. Go to Vercel → Project → Settings → Environment Variables
2. Copy the `DATABASE_URL` value

**Apply the migration using one of these methods:**

**A) Using your PostgreSQL client (EASIEST):**
1. Connect using the DATABASE_URL
2. Run the SQL from `prisma/migrations/20251109_add_sharing_and_analytics/migration.sql`

**B) Using command line:**
```bash
# Set your DATABASE_URL
export DATABASE_URL="postgresql://..."

# Run migration
npm run db:migrate
```

## Verification
After applying the migration, verify the following tables and columns exist:

### Tables
- ✅ User
- ✅ Project (with `isPublic` and `shareToken` columns)
- ✅ ProjectVersion (new)
- ✅ AnalyticsEvent (new)
- ✅ Subscription

### Project Table Columns
- id
- userId
- name
- description
- type
- code
- createdAt
- updatedAt
- **isPublic** ← New
- **shareToken** ← New

## Testing
After migration, test these endpoints:
- `/api/projects` - Should no longer error on `isPublic`
- `/api/analytics` - Should work with new AnalyticsEvent table

## Rollback
If you need to rollback this migration:
```sql
-- Remove new columns from Project
ALTER TABLE "Project" DROP COLUMN "isPublic";
ALTER TABLE "Project" DROP COLUMN "shareToken";

-- Drop new tables
DROP TABLE "AnalyticsEvent";
DROP TABLE "ProjectVersion";
```
