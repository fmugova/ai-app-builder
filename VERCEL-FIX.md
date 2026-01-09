# Fix Vercel Deployment - Missing Environment Variables

## Problem
Your Vercel deployment is using old code because it's missing critical `NEXT_PUBLIC_` environment variables that are required at build time.

## Missing Variables in Vercel

Add these environment variables to your Vercel project:

### Option 1: Via Vercel Dashboard (Recommended - Easiest)

1. Go to https://vercel.com/dashboard
2. Select your project: `ai-app-builder`
3. Go to **Settings** → **Environment Variables**
4. Add each of these variables for **Production** environment:

| Variable Name | Value |
|---------------|-------|
| `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` | `price_1SYaBjC8WSP1936WrOHxrAms` |
| `NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID` | `price_1SYaDrC8WSP1936WdTbWFrBk` |
| `NEXT_PUBLIC_APP_URL` | `https://buildflow-ai.app` |
| `NEXT_PUBLIC_APP_NAME` | `BuildFlow` |

5. After adding all variables, go to **Deployments**
6. Find the latest deployment and click the **⋮** menu
7. Click **Redeploy** → Check "Use existing Build Cache" is OFF
8. Click **Redeploy**

### Option 2: Via Vercel CLI

Run these commands one by one:

```powershell
# 1. Add Pro Price ID
vercel env add NEXT_PUBLIC_STRIPE_PRO_PRICE_ID production
# When prompted, enter: price_1SYaBjC8WSP1936WrOHxrAms

# 2. Add Business Price ID  
vercel env add NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID production
# When prompted, enter: price_1SYaDrC8WSP1936WdTbWFrBk

# 3. Add App URL
vercel env add NEXT_PUBLIC_APP_URL production
# When prompted, enter: https://buildflow-ai.app

# 4. Add App Name
vercel env add NEXT_PUBLIC_APP_NAME production
# When prompted, enter: BuildFlow

# 5. Trigger new deployment
vercel --prod
```

## Why This Fixes The Problem

- **NEXT_PUBLIC_** variables are embedded into the JavaScript bundle **at build time**
- Your local `.env.production` has these variables (we added them earlier)
- But Vercel's production environment didn't have them
- So Vercel builds were missing critical configuration
- This caused features to not appear in production

## After Adding Variables

Once you've added the variables and redeployed:
- ✅ All dashboard features will appear
- ✅ Stripe checkout will work correctly
- ✅ App name and URL will be correct
- ✅ Production will match your local build

## Vercel Build Command Issue

Your `vercel.json` has a custom build command:
```json
"buildCommand": "prisma migrate deploy && prisma generate && next build"
```

This is correct, but if you want to change it:
1. Go to Vercel Dashboard → Settings → General
2. Under "Build & Development Settings"
3. Override the Build Command if needed
4. Or remove the `buildCommand` from `vercel.json` to use Vercel's defaults

## Preventing Future Issues

Always ensure that any new `NEXT_PUBLIC_` variables added to `.env.local` are also added to:
1. `.env.production` (for local production builds)
2. Vercel Dashboard Environment Variables (for production deployments)
