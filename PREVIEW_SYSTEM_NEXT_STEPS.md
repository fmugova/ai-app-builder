# ✅ Preview System Implementation - Next Steps

## 📋 Summary of Changes

The dual preview system has been successfully implemented! Here's what was added:

### Files Created/Modified:

1. ✅ **prisma/schema.prisma** - Added Preview model and PreviewStatus enum
2. ✅ **app/api/preview/deploy/route.ts** - Vercel deployment API endpoint
3. ✅ **components/DualPreviewSystem.tsx** - React preview component
4. ✅ **app/api/cron/cleanup-previews/route.ts** - Cleanup cron job
5. ✅ **vercel.json** - Added cron configuration
6. ✅ **.env.example** - Updated with preview system variables
7. ✅ **PREVIEW_SYSTEM_SETUP.md** - Complete setup guide
8. ✅ **PREVIEW_INTEGRATION_EXAMPLES.md** - Integration examples

---

## 🚀 Required Next Steps

### Step 1: Run Database Migration (REQUIRED)

The Preview model needs to be added to your database:

```powershell
# Generate Prisma client with new Preview model
npx prisma generate

# Create migration
npx prisma migrate dev --name add_preview_model

# This will:
# - Create a new migration file
# - Apply it to your database
# - Update the Prisma client types
```

**Expected output:**
```
✔ Generated Prisma Client
✔ The migration has been created successfully
✔ Applied migration: 20260210_add_preview_model
```

### Step 2: Add Environment Variables

Add to your `.env.local`:

```bash
# ===================================
# PREVIEW SYSTEM
# ===================================

# Vercel API Token (get from https://vercel.com/account/tokens)
VERCEL_TOKEN="your-vercel-token-here"

# Cron job secret (generate with command below)
CRON_SECRET="your-secret-here"
```

**Generate CRON_SECRET:**
```powershell
# PowerShell
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

### Step 3: Restart Development Server

```powershell
# Stop current server (Ctrl+C)
# Then restart
npm run dev
```

---

## 🧪 Testing the Implementation

### Test 1: Verify Database Migration

```powershell
# Open Prisma Studio
npx prisma studio
```

Check that the `Preview` table exists with these columns:
- id
- projectId
- url
- deploymentId
- status
- error
- createdAt
- expiresAt
- deletedAt

### Test 2: Check TypeScript Types

Create a test file to verify Prisma types are working:

```typescript
// test-preview.ts
import { prisma } from '@/lib/prisma'

async function testPreview() {
  // This should have no TypeScript errors
  const previews = await prisma.preview.findMany({
    where: { status: 'READY' },
  })
  
  console.log('Previews:', previews)
}
```

If you see TypeScript errors about `prisma.preview` not existing, run:
```powershell
npx prisma generate
```

### Test 3: Test HTML Preview (No Vercel Required)

1. Open your chat builder
2. Generate a simple HTML project (e.g., "Coffee shop website")
3. Preview should load **instantly** in iframe
4. ✅ Should see "Live Preview" badge

### Test 4: Test Next.js Preview (Requires Vercel Token)

1. Add `VERCEL_TOKEN` to `.env.local`
2. Generate a Next.js project (e.g., "Tax calculator")
3. Click Preview
4. Should see:
   - "Deploying to Vercel..." (30-60s)
   - Preview loads in iframe
   - "Open in New Tab" button

**If you get "Vercel deployment not configured":**
- Check that `VERCEL_TOKEN` is set correctly
- Restart dev server

---

## 📊 Verification Checklist

After completing the steps above, verify:

- [ ] `npx prisma generate` runs without errors
- [ ] `Preview` table exists in database
- [ ] `VERCEL_TOKEN` is set in `.env.local`
- [ ] `CRON_SECRET` is set in `.env.local`
- [ ] Dev server starts without TypeScript errors
- [ ] HTML preview works instantly
- [ ] Next.js preview deploys to Vercel (if token configured)
- [ ] No console errors in browser

---

## 🐛 Troubleshooting

### Error: "Property 'preview' does not exist on type 'PrismaClient'"

**Solution:**
```powershell
npx prisma generate
```

This regenerates the Prisma client with the new Preview model.

### Error: "Migration failed"

**Possible causes:**
1. Database connection issue
2. Existing table conflicts
3. Permission issues

**Solution:**
```powershell
# Check database connection
npx prisma db pull

# If that works, try migration again
npx prisma migrate dev --name add_preview_model

# If still failing, check DATABASE_URL in .env.local
```

### Error: "Vercel deployment not configured"

**This is expected!** The preview system will fall back gracefully if Vercel token is not set.

**To enable Vercel previews:**
1. Get token from https://vercel.com/account/tokens
2. Add to `.env.local`: `VERCEL_TOKEN="your-token"`
3. Restart server

### TypeScript Errors in IDE

**If you see red squiggles:**
1. Run `npx prisma generate`
2. Restart TypeScript server in VS Code:
   - Press `Ctrl+Shift+P`
   - Type "TypeScript: Restart TS Server"
   - Press Enter

---

## 🎯 Optional: Deploy to Production

When you're ready to deploy:

### 1. Set Environment Variables on Vercel

```bash
# Add to Vercel project settings
VERCEL_TOKEN=your-production-token
CRON_SECRET=your-production-secret
```

Or use Vercel CLI:
```powershell
vercel env add VERCEL_TOKEN production
vercel env add CRON_SECRET production
```

### 2. Run Migration on Production

```powershell
# Vercel runs this automatically in buildCommand
# But you can also run manually:
npx prisma migrate deploy
```

### 3. Test Production Deployment

1. Deploy to Vercel: `vercel --prod`
2. Generate a Next.js project
3. Verify preview deploys successfully
4. Check Vercel dashboard for preview deployment

---

## 📈 Monitoring

### Check Preview Usage

```typescript
// Get preview statistics
const stats = await prisma.preview.groupBy({
  by: ['status'],
  _count: true,
})

console.log(stats)
// { READY: 45, ERROR: 5, EXPIRED: 120 }
```

### Monthly Deployment Count

```typescript
const monthStart = new Date()
monthStart.setDate(1)
monthStart.setHours(0, 0, 0, 0)

const monthlyCount = await prisma.preview.count({
  where: {
    createdAt: { gte: monthStart }
  }
})

console.log(`Previews this month: ${monthlyCount}/100`)
```

---

## 🎉 You're Done!

Once you complete the steps above, your dual preview system will be fully operational!

**What happens next:**
1. ✅ HTML apps preview instantly in iframe
2. ✅ Next.js apps deploy to Vercel automatically
3. ✅ Expired previews get cleaned up hourly
4. ✅ Users get professional preview experience

---

## 📞 Need Help?

If you encounter issues:

1. **Check the setup guide:** [PREVIEW_SYSTEM_SETUP.md](./PREVIEW_SYSTEM_SETUP.md)
2. **Review integration examples:** [PREVIEW_INTEGRATION_EXAMPLES.md](./PREVIEW_INTEGRATION_EXAMPLES.md)
3. **Verify all environment variables are set**
4. **Check Vercel dashboard for deployment errors**
5. **Review browser console for client-side errors**

---

## 📝 Quick Commands Reference

```powershell
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name add_preview_model

# Open database viewer
npx prisma studio

# Deploy to production
vercel --prod

# Check preview stats (in your app)
# See "Monitoring" section above
```

---

**Status:** ✅ Implementation Complete - Ready for Migration!
**Next:** Run the commands in "Step 1" above to complete the setup.
