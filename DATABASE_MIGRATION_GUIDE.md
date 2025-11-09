# Database Migration Guide

## Issue
The production database is missing several columns and tables that were added to the Prisma schema, causing 500 errors:
- `Project.isPublic` column
- `Project.shareToken` column
- `ProjectVersion` table
- `AnalyticsEvent` table

## Solution
A migration has been created to add these missing database components.

## How to Apply the Migration

### Option 1: Using Prisma Migrate (Recommended for Production)
```bash
npm run db:migrate
```
This will apply all pending migrations to your database.

### Option 2: Using Prisma DB Push (For Development)
```bash
npm run db:push
```
This will sync your database schema with your Prisma schema without creating migration files.

### Option 3: Manual Application
If you need to apply the migration manually, run the SQL in:
```
prisma/migrations/20251109_add_sharing_and_analytics/migration.sql
```

## For Vercel Deployment

### Environment Setup
Ensure your `DATABASE_URL` environment variable is set in Vercel:
1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Verify `DATABASE_URL` is set correctly

### Automatic Migration on Deploy
The migration will be applied automatically during the build process if you update your build command in Vercel to:
```bash
prisma migrate deploy && next build
```

Or in your package.json (already updated):
```json
"build": "prisma generate && next build --webpack"
```

### Manual Migration in Vercel
If you need to run the migration manually:
1. Connect to your production database using your PostgreSQL client
2. Run the SQL from `prisma/migrations/20251109_add_sharing_and_analytics/migration.sql`

Or use Vercel CLI:
```bash
vercel env pull
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
