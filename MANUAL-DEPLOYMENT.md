# Manual Production Database Setup

## Issue
Vercel deployment not triggering despite all code fixes. The production database may be missing workspace tables.

## Solution
Run SQL scripts directly on the production database to create tables and verify schema.

## Step 1: Verify Current State

Run `verify-production-schema.sql` in your production PostgreSQL database:

```bash
# Connect to production database
psql <PRODUCTION_DATABASE_URL>

# Run verification script
\i verify-production-schema.sql
```

This will show:
- Which workspace tables exist (Workspace, WorkspaceMember, WorkspaceInvite, WorkspaceProject)
- User table promo code fields (promoCodeUsed, discountRate)
- PromoCodes table fields (validUntil, discountType, discountValue)
- Migration status in _prisma_migrations
- Record counts for each table

## Step 2: Create Missing Tables

If any tables are missing, run `check-and-create-workspace-tables.sql`:

```bash
# Still connected to production database
\i check-and-create-workspace-tables.sql
```

This script:
- ✅ Checks if each table exists before creating
- ✅ Creates tables with IF NOT EXISTS (safe to run multiple times)
- ✅ Adds all unique constraints
- ✅ Creates indexes for performance
- ✅ Adds foreign key relationships
- ✅ Provides feedback on what was created

## Step 3: Mark Migration as Applied

After tables are created, tell Prisma the migration is complete:

```bash
# Run locally in your project
npx prisma migrate resolve --applied "20260107205122_add_workspace_feature"
```

This updates `_prisma_migrations` table so Prisma knows the workspace migration has been applied.

## Step 4: Trigger Vercel Redeploy

Make a small change to force Vercel to rebuild:

```bash
# Add a comment or update README
git commit --allow-empty -m "Trigger rebuild after manual DB setup"
git push production main
```

Or use Vercel dashboard:
1. Go to your project on vercel.com
2. Click "Deployments" tab
3. Find latest deployment
4. Click "⋯" menu → "Redeploy"

## Verification Checklist

After setup, verify:

- [ ] All 4 workspace tables exist in production
- [ ] Foreign key constraints are in place
- [ ] Indexes are created
- [ ] Migration is marked as applied in `_prisma_migrations`
- [ ] Vercel deployment completes successfully
- [ ] No TypeScript errors in build logs
- [ ] Can create workspaces in production UI
- [ ] Can invite members to workspaces

## Troubleshooting

### If tables exist but migration shows as not applied:
```sql
-- Check migration status
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;

-- Manually insert migration record if needed
INSERT INTO _prisma_migrations (
    id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count
) VALUES (
    gen_random_uuid()::text,
    '8e7d5f3c1a9b2e4d6f8a0c1e3b5d7f9a2c4e6b8d0f2a4c6e8b0d2f4a6c8e0b2',
    NOW(),
    '20260107205122_add_workspace_feature',
    NULL,
    NULL,
    NOW(),
    1
);
```

### If Vercel still won't deploy:
1. Check Vercel logs for actual error messages
2. Verify environment variables are set (DATABASE_URL, NEXTAUTH_SECRET, etc.)
3. Check if build command is correct in vercel.json
4. Verify GitHub webhook is connected (Settings → Git → Reconnect)

## Database Connection Strings

Make sure you're using the correct connection string format:

```bash
# Development
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# Production (Vercel Postgres or other)
DATABASE_URL="postgres://user:password@host:5432/dbname?sslmode=require"
```

## Schema Validation

Run locally to ensure schema matches:

```bash
# Generate Prisma client
npx prisma generate

# Check schema matches database
npx prisma db pull

# This will create a schema.new.prisma - compare with schema.prisma
# They should be identical except formatting
```

## Files Created

1. **verify-production-schema.sql** - Check what exists in production (read-only)
2. **check-and-create-workspace-tables.sql** - Create missing tables (idempotent)
3. **MANUAL-DEPLOYMENT.md** - This file (instructions)

## Next Steps After Tables Created

1. Test workspace creation in production UI
2. Test member invitations
3. Test project assignment to workspaces
4. Verify email notifications work (Resend API key set?)
5. Test role-based permissions (owner, admin, member)

## Contact

If issues persist after following these steps, check:
- Vercel deployment logs (vercel.com → project → deployments → logs)
- Vercel runtime logs (for API route errors)
- Browser console (for client-side errors)
- Database connection (can production connect to database?)
