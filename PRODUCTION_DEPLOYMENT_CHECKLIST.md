# Production Deployment Checklist

**Date:** February 8, 2026  
**Version:** 1.0.0  
**Status:** Ready for Deployment

## Pre-Deployment Verification

### ✅ Test Suite Status

- [ ] Run full test suite: `npm test`
- [ ] Verify: **225/225 tests passing**
- [ ] Check for TypeScript errors: `npx tsc --noEmit`
- [ ] Verify build succeeds: `npm run build`

**Current Status:**
```
Test Suites: 11 passed, 11 total
Tests:       225 passed, 225 total
```

### ✅ Code Quality

- [x] All TODO items completed
- [x] No console.log statements in production code
- [x] Error handling implemented
- [x] TypeScript strict mode enabled
- [x] ESLint passing

## Email Service Deployment

### Step 1: Choose Email Provider

**Recommended: Resend**
- Simpler API
- Better developer experience
- 100 emails/day free tier
- Built for Next.js/React
- Website: https://resend.com

**Alternative: SendGrid**
- More features (templates, analytics)
- 100 emails/day free tier
- More complex setup
- Website: https://sendgrid.com

### Step 2: Get API Key

**For Resend:**
1. Sign up at https://resend.com
2. Go to API Keys
3. Create new API key
4. Copy key (starts with `re_`)

**For SendGrid:**
1. Sign up at https://sendgrid.com
2. Go to Settings → API Keys
3. Create new API key with "Mail Send" permission
4. Copy key (starts with `SG.`)

### Step 3: Configure Environment Variables

Add to your production environment (Vercel, Railway, etc.):

```bash
# Email Provider (choose ONE)
RESEND_API_KEY="re_your_actual_api_key_here"
# OR
SENDGRID_API_KEY="SG.your_actual_api_key_here"

# Email Configuration
EMAIL_FROM="noreply@yourdomain.com"
CONTACT_EMAIL="support@yourdomain.com"
```

**Vercel:**
```bash
vercel env add RESEND_API_KEY
vercel env add EMAIL_FROM
vercel env add CONTACT_EMAIL
```

**Railway:**
```bash
railway variables set RESEND_API_KEY=re_your_key
railway variables set EMAIL_FROM=noreply@yourdomain.com
railway variables set CONTACT_EMAIL=support@yourdomain.com
```

### Step 4: Verify Email Domain (Production Only)

**For Resend:**
1. Go to Resend Dashboard → Domains
2. Add your domain (e.g., `yourdomain.com`)
3. Add DNS records (SPF, DKIM)
4. Wait for verification (usually 5-10 minutes)
5. Use verified domain in `EMAIL_FROM`

**For SendGrid:**
1. Go to Settings → Sender Authentication
2. Authenticate your domain
3. Add DNS records
4. Verify domain
5. Use authenticated domain in `EMAIL_FROM`

**Development/Testing:**
- Use provider's default domain (e.g., `@resend.dev`)
- Or use console provider (logs emails, doesn't send)

### Step 5: Test Email Service

**Option A: Contact Form**
1. Submit contact form on your website
2. Check admin receives email at `CONTACT_EMAIL`
3. Verify email formatting is correct

**Option B: Newsletter Signup**
1. Subscribe to newsletter
2. Check welcome email received
3. Verify email contains correct branding

**Option C: Admin Email Tool**
1. Login as admin
2. Go to admin panel → Send Email
3. Send test email to yourself
4. Verify delivery

**Option D: API Test**
```bash
curl -X POST https://your-domain.com/api/admin/send-email \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "email": "test@example.com",
    "subject": "Test Email",
    "message": "<h1>Test</h1><p>This is a test email.</p>"
  }'
```

### Step 6: (Optional) Enable Email Verification

**File:** `proxy.ts`

**Current State:** Email verification disabled

**To Enable:**
1. Uncomment email sending block in proxy.ts
2. Ensure `RESEND_API_KEY` or `SENDGRID_API_KEY` set
3. Set `EMAIL_FROM` to verified domain
4. Test signup flow with email verification

**Verification Email Flow:**
1. User signs up
2. User receives verification email
3. User clicks link
4. Account activated

## Webhook Logging Deployment

### Step 1: Database Migration

**Option A: Prisma Migrate (Recommended)**

```bash
# Local/Development
npx prisma migrate dev --name add_webhook_events

# Production
npx prisma migrate deploy
```

**Vercel/Railway:**
- Migration runs automatically during deployment
- Or add to build command: `prisma migrate deploy && next build`

**Option B: Direct SQL**

```bash
# PostgreSQL
psql -h your-db-host -U your-db-user -d your-db-name \
  -f migrations/add-webhook-event-logging.sql

# Or copy SQL and paste into database GUI
```

SQL file: [migrations/add-webhook-event-logging.sql](../migrations/add-webhook-event-logging.sql)

### Step 2: Verify Migration

```sql
-- Check table exists
SELECT COUNT(*) FROM "WebhookEvent";
-- Should return: 0 (empty table)

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'WebhookEvent';
-- Should return: 7 indexes
```

**Expected Indexes:**
- WebhookEvent_pkey (Primary Key)
- WebhookEvent_provider_idx
- WebhookEvent_eventType_idx
- WebhookEvent_eventId_idx
- WebhookEvent_userId_idx
- WebhookEvent_status_idx
- WebhookEvent_createdAt_idx
- WebhookEvent_provider_eventId_idx

### Step 3: Configure Stripe Webhook

**Stripe Dashboard:**
1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter URL: `https://your-domain.com/api/stripe/webhook`
4. Select events:
   - ✅ checkout.session.completed
   - ✅ customer.subscription.updated
   - ✅ customer.subscription.deleted
   - ✅ invoice.payment_succeeded
   - ✅ invoice.payment_failed
5. Click "Add endpoint"
6. Copy **Signing secret** (starts with `whsec_`)

**Add to Environment:**
```bash
STRIPE_WEBHOOK_SECRET="whsec_your_signing_secret"
```

**Vercel:**
```bash
vercel env add STRIPE_WEBHOOK_SECRET
```

**Railway:**
```bash
railway variables set STRIPE_WEBHOOK_SECRET=whsec_your_secret
```

### Step 4: Test Webhook

**Stripe Dashboard:**
1. Go to webhook endpoint
2. Click "Send test webhook"
3. Select `checkout.session.completed`
4. Click "Send test webhook"

**Verify Logging:**
```bash
# Check webhook was logged
curl https://your-domain.com/api/admin/webhooks?limit=1 \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

# Should return the test webhook event
```

**Stripe CLI (Local Testing):**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test event
stripe trigger checkout.session.completed
```

### Step 5: Monitor Webhook Health

**Get Statistics:**
```bash
GET /api/admin/webhooks?action=stats
```

**Expected Response:**
```json
{
  "stats": {
    "total": 1,
    "processed": 1,
    "failed": 0,
    "pending": 0,
    "successRate": 100,
    "timeRangeHours": 24
  }
}
```

**View Recent Events:**
```bash
GET /api/admin/webhooks?limit=10
```

**View Failed Events:**
```bash
GET /api/admin/webhooks?status=failed
```

### Step 6: (Optional) Setup Cleanup Cron Job

**Create Cron Endpoint:**

File: `app/api/cron/cleanup-webhooks/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { cleanupOldWebhookEvents } from '@/lib/webhook-logger'

export async function GET() {
  // Delete events older than 90 days
  const deletedCount = await cleanupOldWebhookEvents(90)
  
  return NextResponse.json({
    success: true,
    deletedCount,
    message: `Cleaned up ${deletedCount} old webhook events`
  })
}
```

**Vercel Cron:**

File: `vercel.json`

```json
{
  "crons": [{
    "path": "/api/cron/cleanup-webhooks",
    "schedule": "0 2 * * *"
  }]
}
```

Runs daily at 2 AM UTC.

**Railway Cron:**

Use external cron service (e.g., cron-job.org, EasyCron) to hit:
```
GET https://your-domain.com/api/cron/cleanup-webhooks
```

## Environment Variables Checklist

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"

# Stripe (if using payments)
STRIPE_PUBLIC_KEY="pk_live_..."
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email Service (choose ONE provider)
RESEND_API_KEY="re_..."  # OR
SENDGRID_API_KEY="SG...."

# Email Configuration
EMAIL_FROM="noreply@yourdomain.com"
CONTACT_EMAIL="support@yourdomain.com"
```

### Optional Variables

```bash
# GitHub Integration (if using)
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
GITHUB_ACCESS_TOKEN="ghp_..."

# Google Analytics (if using)
NEXT_PUBLIC_GA_ID="G-..."

# Sentry (if using)
SENTRY_DSN="https://..."
SENTRY_AUTH_TOKEN="..."
```

### Verify All Variables Set

```bash
# Check .env.local (development)
cat .env.local

# Check Vercel (production)
vercel env ls

# Check Railway (production)
railway variables
```

### Use Environment Validation

The health check endpoint validates all required variables:

```bash
GET /api/health

# Response will show missing variables:
{
  "status": "warn",
  "environment": {
    "status": "degraded",
    "issues": [
      "RESEND_API_KEY not set (warning)",
      "STRIPE_WEBHOOK_SECRET not set (warning)"
    ]
  }
}
```

## Deployment Steps

### Vercel Deployment

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Link project
vercel link

# 4. Set environment variables
vercel env add RESEND_API_KEY
vercel env add EMAIL_FROM
vercel env add CONTACT_EMAIL
vercel env add STRIPE_WEBHOOK_SECRET
# ... add all other variables

# 5. Deploy
vercel --prod

# 6. Run migration (if needed)
# Go to your database provider and run:
# migrations/add-webhook-event-logging.sql
```

### Railway Deployment

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Initialize project
railway init

# 4. Set environment variables
railway variables set RESEND_API_KEY=re_your_key
railway variables set EMAIL_FROM=noreply@yourdomain.com
railway variables set CONTACT_EMAIL=support@yourdomain.com
railway variables set STRIPE_WEBHOOK_SECRET=whsec_your_secret
# ... add all other variables

# 5. Deploy
railway up

# 6. Add database
railway add postgres

# 7. Run migration
railway run npx prisma migrate deploy
```

### Manual Deployment

```bash
# 1. Build application
npm run build

# 2. Set environment variables on server
export RESEND_API_KEY="re_your_key"
export EMAIL_FROM="noreply@yourdomain.com"
# ... set all variables

# 3. Run database migration
npx prisma migrate deploy

# 4. Start application
npm start
```

## Post-Deployment Verification

### Step 1: Health Check

```bash
curl https://your-domain.com/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-08T10:30:00Z",
  "environment": {
    "status": "healthy",
    "requiredVarsSet": true,
    "optionalVarsSet": true
  },
  "database": {
    "status": "healthy",
    "connected": true
  },
  "email": {
    "status": "healthy",
    "provider": "resend",
    "configured": true
  }
}
```

### Step 2: Test Contact Form

1. Go to: `https://your-domain.com/contact`
2. Fill out form
3. Submit
4. Verify admin receives email

### Step 3: Test Newsletter

1. Go to: `https://your-domain.com/newsletter`
2. Enter email address
3. Subscribe
4. Verify welcome email received

### Step 4: Test Stripe Webhook

1. Go to Stripe Dashboard → Webhooks
2. Send test webhook
3. Check webhook logged:
   ```bash
   curl https://your-domain.com/api/admin/webhooks?limit=1
   ```
4. Verify event appears in response

### Step 5: Check Webhook Statistics

```bash
curl https://your-domain.com/api/admin/webhooks?action=stats
```

**Expected Response:**
```json
{
  "stats": {
    "total": 5,
    "processed": 5,
    "failed": 0,
    "pending": 0,
    "successRate": 100,
    "timeRangeHours": 24
  }
}
```

### Step 6: Run Tests in Production

```bash
# If you have access to production server
npm test

# Should show: 225/225 tests passing
```

## Monitoring & Maintenance

### Daily Checks

**Webhook Health:**
```bash
# Check success rate
curl https://your-domain.com/api/admin/webhooks?action=stats
```

**Email Service:**
- Verify emails are being delivered
- Check spam folder reports
- Monitor email provider dashboard

**Database:**
- Check database size
- Monitor webhook event table growth
- Verify indexes are being used

### Weekly Checks

**Failed Webhooks:**
```bash
# Get failed events
curl https://your-domain.com/api/admin/webhooks?status=failed

# Investigate and retry if needed
curl -X POST https://your-domain.com/api/admin/webhooks \
  -d '{"action": "retry", "id": "WEBHOOK_ID"}'
```

**Email Provider:**
- Check sending limits
- Review deliverability metrics
- Update DNS records if needed

### Monthly Checks

**Database Cleanup:**
- Verify cleanup cron is running
- Check webhook event table size
- Adjust retention period if needed

**Email Domain:**
- Renew domain if needed
- Update DNS records
- Check SPF/DKIM status

## Rollback Plan

### If Email Service Fails

1. **Identify Issue:**
   - Check API key validity
   - Verify domain verification
   - Check email provider status

2. **Quick Fix:**
   ```bash
   # Switch to console provider (logs only)
   vercel env rm RESEND_API_KEY
   vercel env rm SENDGRID_API_KEY
   ```

3. **Emails will be logged but not sent** (graceful degradation)
   - Contact form still works
   - Newsletter still accepts signups
   - Check logs for email content

4. **Fix Permanently:**
   - Get new API key
   - Re-verify domain
   - Add API key back to environment

### If Webhook Logging Fails

1. **Webhooks still process** (logging doesn't block requests)
2. **Check database connection:**
   ```bash
   curl https://your-domain.com/api/health
   ```
3. **Verify WebhookEvent table exists:**
   ```sql
   SELECT COUNT(*) FROM "WebhookEvent";
   ```
4. **If table missing, re-run migration:**
   ```bash
   npx prisma migrate deploy
   ```

### If Tests Fail

1. **Identify failing tests:**
   ```bash
   npm test
   ```
2. **Check environment variables:**
   ```bash
   vercel env ls
   ```
3. **Verify database schema:**
   ```bash
   npx prisma db pull
   ```
4. **Rollback to last working deployment:**
   ```bash
   vercel rollback
   ```

## Security Checklist

### Authentication

- [ ] `NEXTAUTH_SECRET` is strong random string (32+ characters)
- [ ] `NEXTAUTH_URL` matches production domain
- [ ] Session cookies use `secure` flag (HTTPS only)
- [ ] Admin role required for sensitive endpoints

### API Keys

- [ ] All API keys are in environment variables (not code)
- [ ] `.env.local` is in `.gitignore`
- [ ] Production keys are different from development
- [ ] Keys have minimum required permissions

### Database

- [ ] Database uses SSL connection
- [ ] Database password is strong (16+ characters)
- [ ] Database user has minimum required permissions
- [ ] Connection string not exposed in logs

### Webhooks

- [ ] Stripe webhook signature verification enabled
- [ ] `STRIPE_WEBHOOK_SECRET` set correctly
- [ ] Webhook endpoint uses HTTPS
- [ ] Failed webhooks don't expose sensitive data

### Email

- [ ] Email domain verified with SPF/DKIM
- [ ] `EMAIL_FROM` uses verified domain
- [ ] Email templates escape user input (XSS protection)
- [ ] Email provider API key kept secret

## Performance Checklist

### Database

- [ ] 7 indexes created on WebhookEvent table
- [ ] Query plans use indexes (check with `EXPLAIN`)
- [ ] Connection pooling configured (Prisma default: 10)
- [ ] Regular cleanup of old webhook events

### API

- [ ] Response compression enabled (Next.js default)
- [ ] API routes use caching where appropriate
- [ ] Rate limiting implemented for sensitive endpoints
- [ ] Webhook events processed asynchronously

### Email

- [ ] Bulk email sending uses batching (100/batch default)
- [ ] Rate limiting prevents email provider throttling
- [ ] Email sending doesn't block user requests
- [ ] Failed emails logged but don't crash requests

## Support & Troubleshooting

### Common Issues

**"Email not received"**
1. Check spam folder
2. Verify `EMAIL_FROM` domain is verified
3. Check email provider dashboard for bounces
4. Verify API key is valid
5. Check server logs for errors

**"Webhook not logged"**
1. Verify WebhookEvent table exists
2. Check database connection
3. Verify `STRIPE_WEBHOOK_SECRET` is correct
4. Check Stripe webhook endpoint status
5. Look for errors in webhook handler logs

**"Tests failing in production"**
1. Verify all environment variables set
2. Check database schema matches
3. Verify test database access
4. Check for missing dependencies

### Getting Help

**Documentation:**
- Email Service: [docs/EMAIL_SERVICE_GUIDE.md](../docs/EMAIL_SERVICE_GUIDE.md)
- Email Integration: [docs/EMAIL_INTEGRATION_COMPLETE.md](../docs/EMAIL_INTEGRATION_COMPLETE.md)
- Webhook Logging: [docs/WEBHOOK_LOGGING_COMPLETE.md](../docs/WEBHOOK_LOGGING_COMPLETE.md)

**Provider Documentation:**
- Resend: https://resend.com/docs
- SendGrid: https://docs.sendgrid.com
- Stripe Webhooks: https://stripe.com/docs/webhooks

**Test Suite:**
- Run tests to see examples: `npm test`
- Check test files for usage patterns
- Review mock implementations

## Deployment Checklist Summary

### Before Deployment

- [ ] All 225 tests passing
- [ ] TypeScript compiles without errors
- [ ] Build succeeds (`npm run build`)
- [ ] Environment variables documented
- [ ] Database migration SQL prepared

### During Deployment

- [ ] Set all required environment variables
- [ ] Run database migration
- [ ] Deploy application
- [ ] Configure Stripe webhook endpoint
- [ ] Verify email domain (production only)

### After Deployment

- [ ] Health check returns healthy status
- [ ] Contact form sends emails
- [ ] Newsletter sends welcome emails
- [ ] Stripe webhooks are logged
- [ ] Webhook statistics show 100% success rate
- [ ] All tests passing in production

### Ongoing Maintenance

- [ ] Monitor webhook success rate daily
- [ ] Check failed webhooks weekly
- [ ] Verify cleanup cron runs monthly
- [ ] Review email deliverability metrics
- [ ] Update dependencies quarterly

---

## Quick Reference

### Key URLs

- Health Check: `GET /api/health`
- Webhook Logs: `GET /api/admin/webhooks`
- Webhook Stats: `GET /api/admin/webhooks?action=stats`
- Send Email: `POST /api/admin/send-email`

### Key Commands

```bash
# Test
npm test

# Build
npm run build

# Migrate
npx prisma migrate deploy

# Deploy (Vercel)
vercel --prod

# Deploy (Railway)
railway up
```

### Key Files

- Email Service: `lib/email-service.ts`
- Webhook Logger: `lib/webhook-logger.ts`
- Stripe Handler: `app/api/stripe/webhook/route.ts`
- Health Check: `app/api/health/route.ts`
- Environment: `.env.local` (dev), Vercel/Railway (prod)

---

**Deployment Status:** Ready ✅  
**Last Updated:** February 8, 2026  
**Next Milestone:** Production deployment

For detailed information, see individual documentation files in [docs/](../docs/).
