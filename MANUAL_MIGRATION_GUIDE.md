# Manual Migration Guide

## Problem
Prisma migration failing with error: "The underlying table for model `User` does not exist in shadow database"

## Solution
Run SQL migrations directly in your production database to add Supabase integration support.

## Quick Start

### Option 1: Using PowerShell Script (Recommended)

```powershell
# Run the interactive migration helper
.\run-migration.ps1
```

The script will:
1. Check your DATABASE_URL
2. Show you options (apply/rollback/view)
3. Execute the migration safely

### Option 2: Using Prisma CLI

```powershell
npx prisma db execute --file migrations/manual-add-supabase-integration.sql --schema prisma/schema.prisma
```

### Option 3: Using psql Directly

```powershell
psql $env:DATABASE_URL -f migrations/manual-add-supabase-integration.sql
```

### Option 4: Copy/Paste in Database GUI

1. Open your database GUI (pgAdmin, DBeaver, Supabase Studio, etc.)
2. Open `migrations/manual-add-supabase-integration.sql`
3. Copy the SQL
4. Paste and execute in your database

## What Gets Added

### New Table: SupabaseIntegration
```sql
- id (TEXT, PRIMARY KEY)
- userId (TEXT, UNIQUE, FOREIGN KEY → User.id)
- accessToken (TEXT)
- refreshToken (TEXT, nullable)
- organizationId (TEXT, nullable)
- username (TEXT, nullable)
- email (TEXT, nullable)
- connectedAt (TIMESTAMP)
- updatedAt (TIMESTAMP)
```

### Enhanced Table: Deployment
```sql
New columns:
- supabaseProjectId (TEXT, nullable)
- supabaseUrl (TEXT, nullable)
- supabaseAnonKey (TEXT, nullable)
- supabaseServiceKey (TEXT, nullable)
- databasePassword (TEXT, nullable)
- buildTime (INTEGER, nullable)
- deployedAt (TIMESTAMP, nullable)
```

## Verification

After running the migration, verify it worked:

```sql
-- Check SupabaseIntegration table exists
SELECT * FROM "SupabaseIntegration" LIMIT 1;

-- Check new columns in Deployment table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Deployment'
AND column_name IN ('supabaseProjectId', 'supabaseUrl', 'buildTime', 'deployedAt');
```

Expected output: You should see all the new columns listed.

## After Migration

1. **Generate Prisma Client:**
   ```powershell
   npx prisma generate
   ```

2. **Mark migration as applied** (so Prisma doesn't try to run it again):
   ```powershell
   # Create a dummy migration file to mark this as complete
   npx prisma migrate resolve --applied "add_supabase_integration"
   ```

3. **Add environment variables** to `.env.local`:
   ```env
   SUPABASE_CLIENT_ID=your_client_id
   SUPABASE_CLIENT_SECRET=your_client_secret
   SUPABASE_REDIRECT_URI=http://localhost:3000/api/integrations/supabase/callback
   ```

4. **Test the changes:**
   ```powershell
   npm run dev
   ```

## Rollback (If Needed)

If something goes wrong, you can rollback:

```powershell
# Using the PowerShell script
.\run-migration.ps1
# Then choose option 2 (Rollback)

# OR using Prisma CLI
npx prisma db execute --file migrations/rollback-supabase-integration.sql --schema prisma/schema.prisma
```

**⚠️ WARNING:** Rollback will delete all Supabase integration data!

## Troubleshooting

### Error: "permission denied for schema public"
**Solution:** You need database owner/admin permissions to create tables.

### Error: "column already exists"
**Solution:** The migration script checks for existing columns and skips them safely. You can re-run it.

### Error: "relation already exists"
**Solution:** The SupabaseIntegration table already exists. Skip to step 2 (generate Prisma client).

### Prisma still shows migration as pending
**Solution:** Run `npx prisma migrate resolve --applied "add_supabase_integration"` to mark it as complete.

## Next Steps

After successful migration:
1. ✅ Schema updated in production
2. ✅ Prisma client generated
3. 📝 Add OAuth credentials (see AUTO_DEPLOYMENT_INTEGRATION_GUIDE.md)
4. 🧪 Test auto-deployment flow
5. 🚀 Deploy to production

## Files Reference

- **Migration SQL:** `migrations/manual-add-supabase-integration.sql`
- **Rollback SQL:** `migrations/rollback-supabase-integration.sql`
- **Helper Script:** `run-migration.ps1`
- **Integration Guide:** `AUTO_DEPLOYMENT_INTEGRATION_GUIDE.md`
- **Complete Docs:** `AUTO_DEPLOYMENT_COMPLETE.md`
