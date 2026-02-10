# 🛠️ How to Run Preview System SQL Migration on Supabase

## Why Use Direct SQL Instead of Prisma Migrate?

Your `.env.local` shows you're using Supabase with connection pooling (pgbouncer):
```
DATABASE_URL="...pooler.supabase.com:6543/postgres?pgbouncer=true"
```

**Prisma migrations don't work well with pgbouncer** because they require transactional DDL operations. That's why `npx prisma migrate dev` failed.

---

## ✅ Solution: Run SQL Directly

### Option 1: Supabase Dashboard (Recommended - Easiest)

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project: `szwruvvcjmwxdigthjze`

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Paste SQL**
   - Open the file: `add-preview-system.sql`
   - Copy ALL the contents (Ctrl+A, Ctrl+C)
   - Paste into Supabase SQL Editor

4. **Run the Migration**
   - Click "Run" button (or press Ctrl+Enter)
   - Wait for completion (~2-3 seconds)

5. **Verify Success**
   - You should see: "✅ Preview system migration completed successfully!"
   - Scroll down to see verification results

---

### Option 2: Command Line (Using psql)

If you prefer command line:

```powershell
# Navigate to your project directory
cd C:\Users\panas\ai-app-builder

# Run the SQL file directly
# Use the DIRECT_URL (not pooled connection)
psql "postgresql://postgres.szwruvvcjmwxdigthjze:oJQeo3FU7Su3DLvV@aws-1-eu-west-2.pooler.supabase.com:5432/postgres" -f add-preview-system.sql
```

**Note:** Uses port `5432` (direct) instead of `6543` (pooled)

---

## 📋 After Running SQL

### Step 1: Update Prisma Schema from Database

Since you modified the database directly, update Prisma to match:

```powershell
# Pull the latest database schema
npx prisma db pull

# This will update your schema.prisma with the new Preview table
```

**Expected output:**
```
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "postgres"

✔ Introspected 50 models and wrote them into prisma\schema.prisma
```

### Step 2: Generate Prisma Client

```powershell
# Generate TypeScript types
npx prisma generate
```

**Expected output:**
```
✔ Generated Prisma Client
```

### Step 3: Restart Dev Server

```powershell
# Stop current server (Ctrl+C)
# Then restart
npm run dev
```

---

## ✅ Verification Steps

### 1. Check Database

In Supabase Dashboard → SQL Editor, run:

```sql
-- Should return true
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'Preview'
) AS preview_table_exists;
```

### 2. Check Prisma Client

Create a test file:

```typescript
// test-preview.ts
import { prisma } from '@/lib/prisma'

async function test() {
  // This should work without TypeScript errors
  const previews = await prisma.preview.findMany()
  console.log('✅ Preview model works!', previews.length)
}

test()
```

Run it:
```powershell
npx tsx test-preview.ts
```

### 3. Check Table Structure

In Supabase Dashboard → Table Editor:
- Look for "Preview" table in the list
- Should have columns: id, projectId, url, deploymentId, status, error, createdAt, expiresAt, deletedAt

---

## 🔒 Security (Row Level Security)

The SQL migration automatically enables RLS with these policies:

✅ Users can only view previews of their own projects  
✅ Users can only create previews for their own projects  
✅ Users can only update/delete their own previews  

This ensures users can't access each other's preview deployments.

---

## 🐛 Troubleshooting

### Error: "relation 'Project' does not exist"

**Cause:** Project table name might be different  
**Solution:** Check your actual table name:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%roject%';
```

Then update the foreign key in the SQL file.

### Error: "type 'PreviewStatus' already exists"

**Cause:** You ran the migration twice  
**Solution:** This is safe! The script uses `IF NOT EXISTS` to prevent duplicates.

### Error: "permission denied"

**Cause:** Database user doesn't have CREATE permissions  
**Solution:** Make sure you're logged in as the postgres user in Supabase Dashboard

---

## 📊 What the SQL Creates

### 1. PreviewStatus Enum
```sql
'DEPLOYING' | 'READY' | 'ERROR' | 'EXPIRED'
```

### 2. Preview Table
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key (cuid) |
| projectId | TEXT | Foreign key to Project |
| url | TEXT | Vercel deployment URL |
| deploymentId | TEXT | Vercel deployment ID (unique) |
| status | PreviewStatus | Current deployment status |
| error | TEXT | Error message (if failed) |
| createdAt | TIMESTAMP | When preview was created |
| expiresAt | TIMESTAMP | When preview expires (24h) |
| deletedAt | TIMESTAMP | When preview was deleted |

### 3. Indexes
- `Preview_projectId_idx` - Fast project lookups
- `Preview_expiresAt_idx` - Fast expiry checks
- `Preview_status_idx` - Fast status filtering

### 4. Foreign Keys
- `Preview → Project` (CASCADE on delete)

---

## ⚡ Quick Commands Summary

```powershell
# 1. Run SQL in Supabase Dashboard (copy/paste add-preview-system.sql)

# 2. Update Prisma schema
npx prisma db pull

# 3. Generate Prisma client
npx prisma generate

# 4. Restart dev server
npm run dev

# 5. Test (optional)
npx tsx test-preview.ts
```

---

## 🎉 Success Indicators

After completing all steps, you should see:

✅ No TypeScript errors in API routes  
✅ `prisma.preview` autocompletes in your IDE  
✅ Preview table visible in Supabase Dashboard  
✅ Dev server starts without errors  
✅ Test file runs successfully  

---

## 🆘 Still Having Issues?

1. **Check Supabase connection:**
   ```powershell
   npx prisma db pull
   # Should connect successfully
   ```

2. **Verify .env.local has correct URLs:**
   ```
   DATABASE_URL="...6543..." (pooled)
   DIRECT_URL="...5432..." (direct)
   ```

3. **Check Supabase logs:**
   - Go to Supabase Dashboard → Logs → Database
   - Look for any error messages

---

**Ready to proceed?** Open Supabase Dashboard and run the SQL! 🚀
