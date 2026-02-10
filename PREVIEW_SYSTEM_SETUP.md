# 🚀 Dual Preview System - Setup Guide

## Overview

BuildFlow AI now supports **two preview types**:
1. **Simple HTML** → Instant iframe preview (no setup needed ✅)
2. **Full-Stack Next.js** → Vercel deployment preview (requires setup)

---

## 📋 Prerequisites

- Vercel account (free tier works)
- Access to Vercel API tokens
- PostgreSQL database (already configured)

---

## ⚙️ Setup Instructions

### Step 1: Get Vercel API Token (5 minutes)

1. Go to https://vercel.com/account/tokens
2. Click **"Create Token"**
3. Name: `BuildFlow Preview`
4. Scope: **Full Access** (or scoped to specific team)
5. Click **"Create"**
6. **Copy the token** (you won't see it again!)

### Step 2: Add Environment Variables (2 minutes)

Add to your `.env.local`:

```bash
# ===================================
# PREVIEW SYSTEM
# ===================================

# Vercel API Token (from Step 1)
VERCEL_TOKEN="your-vercel-token-here"

# Optional: Vercel Team ID (if using team account)
VERCEL_TEAM_ID="team_xxxxx"

# Cron job authentication secret
CRON_SECRET="generate-with-command-below"
```

**Generate CRON_SECRET:**

```bash
# PowerShell (Windows)
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# Or use any random string generator
# Example: "your-secret-cron-key-12345"
```

### Step 3: Run Database Migration (3 minutes)

```bash
# Generate Prisma client with new Preview model
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name add_preview_model

# Verify migration
npx prisma studio
# Check that "Preview" table exists
```

### Step 4: Deploy to Vercel (Optional)

If you're deploying to Vercel:

```bash
# Set environment variables on Vercel
vercel env add VERCEL_TOKEN
vercel env add CRON_SECRET

# Deploy
vercel --prod
```

Or add via Vercel Dashboard:
1. Go to your project settings
2. Environment Variables
3. Add `VERCEL_TOKEN` and `CRON_SECRET`

---

## 🧪 Testing

### Test Simple HTML Preview

1. Create a new project: "Coffee Shop Website"
2. Generate HTML app
3. Preview should load **instantly** in iframe ✅

### Test Next.js Preview

1. Create a new project: "Tax Calculator"
2. Generate Next.js app
3. Click "Preview"
4. Should see:
   - "Deploying to Vercel..." (30-60s)
   - Preview iframe with deployed app
   - "Open in New Tab" button

**Expected URL:** `https://preview-tax-calculator-1234567890.vercel.app`

---

## 📊 Usage

### In Your Components

```typescript
import DualPreviewSystem from '@/components/DualPreviewSystem'

// For HTML projects
<DualPreviewSystem
  project={{
    id: project.id,
    type: 'html',
    html: project.code,
  }}
/>

// For Next.js projects
<DualPreviewSystem
  project={{
    id: project.id,
    type: 'nextjs',
    files: project.files, // Array of { path, content }
  }}
/>
```

### Determining Project Type

```typescript
// Check project type
const projectType = project.projectType === 'nextjs' ? 'nextjs' : 'html'

// Or based on files
const isNextJs = project.files && project.files.length > 1
```

---

## 🔧 Troubleshooting

### Issue: "Deployment failed"

**Possible causes:**
1. Invalid `VERCEL_TOKEN`
2. Token missing deployment permissions
3. Vercel rate limit exceeded

**Solution:**
```bash
# Test token manually
curl -H "Authorization: Bearer $VERCEL_TOKEN" \
  https://api.vercel.com/v9/projects
  
# Should return list of projects (not 401/403)
```

### Issue: Preview shows blank page

**Possible causes:**
1. Missing required files (package.json, app/page.tsx)
2. Build failed on Vercel
3. Wrong framework configuration

**Solution:**
1. Check Vercel dashboard for deployment logs
2. Verify all required Next.js files are included
3. Check browser console for errors

### Issue: "Vercel deployment not configured"

**Cause:** `VERCEL_TOKEN` environment variable not set

**Solution:**
```bash
# Add to .env.local
VERCEL_TOKEN="your-token-here"

# Restart dev server
npm run dev
```

---

## 💰 Cost Management

### Free Tier Limits (Vercel)

- ✅ 100 deployments/month
- ✅ Unlimited bandwidth
- ✅ Preview deployments included

**For BuildFlow AI:**
- ~100 users = ~500 previews/month
- **Recommended:** Vercel Pro ($20/mo) for unlimited

### Optimization Tips

1. **Cache Recent Previews** (< 1 hour old)
   - Reuse existing deployment URLs
   - Already implemented in API route ✅

2. **Auto-Cleanup Expired Previews**
   - Cron job runs hourly
   - Deletes previews > 24 hours old
   - Already configured in vercel.json ✅

3. **Rate Limit Users** (Optional)
   ```typescript
   // Max 5 previews per hour per user
   const recentPreviews = await prisma.preview.count({
     where: {
       project: { userId },
       createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }
     }
   })
   
   if (recentPreviews >= 5) {
     throw new Error('Rate limit exceeded')
   }
   ```

---

## 📈 Monitoring

### Preview Analytics

```typescript
// Track preview usage
const stats = await prisma.preview.groupBy({
  by: ['status'],
  _count: true,
})

console.log('Preview Stats:', stats)
// Example: { READY: 45, ERROR: 5, EXPIRED: 120 }
```

### Success Rate

```typescript
const total = await prisma.preview.count()
const successful = await prisma.preview.count({
  where: { status: 'READY' }
})

const successRate = (successful / total) * 100
console.log(`Success Rate: ${successRate}%`)
```

### Monthly Usage

```typescript
const monthStart = new Date(new Date().setDate(1))

const monthlyPreviews = await prisma.preview.count({
  where: {
    createdAt: { gte: monthStart }
  }
})

console.log(`Previews this month: ${monthlyPreviews}/100`)
```

---

## 🔐 Security

### Cron Job Protection

The cleanup cron job requires authentication:

```typescript
// In route.ts
const authHeader = request.headers.get('authorization')
if (authHeader !== `Bearer ${CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Vercel automatically includes the correct auth header** for configured cron jobs.

### Preview Isolation

- Each preview is a separate Vercel deployment
- No sharing of environment between previews
- Automatic cleanup after 24 hours

---

## 🎯 Next Steps

### Phase 1: Core Setup ✅
- [x] Prisma schema updated
- [x] API route created
- [x] Component created
- [x] Cron job configured
- [ ] Test with real project
- [ ] Deploy to production

### Phase 2: Enhancements (Optional)
- [ ] Add StackBlitz embed as free alternative
- [ ] Preview history UI
- [ ] Share preview URLs publicly
- [ ] Analytics dashboard
- [ ] User rate limiting

---

## 📞 Support

### Common Questions

**Q: Can I use the free Vercel tier?**
A: Yes! 100 deployments/month is perfect for testing. Upgrade to Pro ($20/mo) when you need more.

**Q: What if I hit rate limits?**
A: Implement caching (already done) and user rate limiting. Or upgrade to Vercel Pro.

**Q: Can I use other platforms instead of Vercel?**
A: Yes! Netlify, Railway, or your own infrastructure work too. You'll need to modify the API route.

**Q: Do previews include databases?**
A: No. Use seed data or connect to Supabase temporary projects.

**Q: How do I debug failed deployments?**
A: Check Vercel dashboard → Deployments → Click failed deployment → View logs

---

## ✅ Verification Checklist

After setup, verify:

- [ ] `VERCEL_TOKEN` is set in `.env.local`
- [ ] `CRON_SECRET` is set in `.env.local`
- [ ] Prisma migration created Preview table
- [ ] Simple HTML preview works instantly
- [ ] Next.js preview deploys to Vercel
- [ ] Preview iframe loads successfully
- [ ] "Open in New Tab" button works
- [ ] Cron job is configured in vercel.json
- [ ] No errors in console

---

## 🎉 You're All Set!

Your dual preview system is ready to use. Users can now:
- Preview HTML apps instantly
- Deploy and preview full-stack Next.js apps
- Get real production-like previews

**Cost:** $0-20/mo (depending on usage)
**Setup Time:** ~15 minutes
**User Experience:** Professional ✨

---

## 📁 Files Modified

1. ✅ `prisma/schema.prisma` - Added Preview model
2. ✅ `app/api/preview/deploy/route.ts` - Deployment API
3. ✅ `components/DualPreviewSystem.tsx` - Preview component
4. ✅ `app/api/cron/cleanup-previews/route.ts` - Cleanup cron
5. ✅ `vercel.json` - Cron configuration

---

## 🆘 Need Help?

1. Check Vercel documentation: https://vercel.com/docs/rest-api
2. Review error logs in Vercel dashboard
3. Test API token with curl command above
4. Verify environment variables are set correctly

---

**Status:** ✅ Implementation Complete!
**Last Updated:** February 10, 2026
