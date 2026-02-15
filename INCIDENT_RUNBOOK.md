# BuildFlow AI — Incident Response Runbook

> **Classification:** Internal Operations Document
> Last updated: 2025-01-01
> Owner: Engineering Team

---

## Emergency Contacts

| Role | Contact | When to reach |
|------|---------|---------------|
| **On-call Engineer** | *(add your phone)* | Always first |
| **Backup Engineer** | *(add backup phone)* | If on-call unreachable > 15 min |
| **Vercel Support** | https://vercel.com/support | Deployment / infra outages |
| **Supabase Support** | https://supabase.com/support | Database issues |
| **Stripe Support** | https://support.stripe.com | Payment failures |
| **Upstash Support** | https://upstash.com/support | Redis / rate-limit issues |
| **Anthropic Support** | https://support.anthropic.com | AI generation failures |
| **Resend Support** | https://resend.com/support | Email delivery failures |

---

## Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|---------|
| **P1 — Critical** | Full outage or data breach | Immediate (24/7) | Site down, DB breach, payments broken |
| **P2 — High** | Core feature degraded | < 30 min (business hours) | AI gen failing, login broken |
| **P3 — Medium** | Non-core feature broken | < 2 hours | Analytics missing, email bouncing |
| **P4 — Low** | Minor issue | Next business day | UI glitch, slow load |

---

## Runbooks

---

### 1. Site Down / Complete Outage

**Symptoms:** 5xx errors on all pages, health check failing, Sentry flood of errors.

**Diagnosis:**
```bash
# 1. Check health endpoint
curl https://buildflow-ai.app/api/health

# 2. Check Vercel deployment status
# → https://vercel.com/dashboard → buildflow-ai → Deployments

# 3. Check Supabase status
# → https://status.supabase.com

# 4. Check Upstash status
# → https://status.upstash.com
```

**Mitigation steps:**

1. **Enable maintenance mode** (prevents users seeing error pages):
   ```bash
   curl -X POST https://buildflow-ai.app/api/admin/maintenance \
     -H "Cookie: <admin-session-cookie>" \
     -H "Content-Type: application/json" \
     -d '{"message": "We are experiencing an outage and working to restore service."}'
   ```

2. **If bad deployment:** Roll back in Vercel dashboard → Deployments → Promote previous deployment.

3. **If database down:** Check Supabase dashboard → check connection pooler → restart if needed.

4. **If Redis down:** Upstash is highly available — check Upstash dashboard. Rate limiting will fail-open (won't block requests).

5. **Once resolved:** Disable maintenance mode:
   ```bash
   curl -X DELETE https://buildflow-ai.app/api/admin/maintenance \
     -H "Cookie: <admin-session-cookie>"
   ```

**Post-incident:**
- Write a 5-line incident summary in Slack #incidents
- Update status page / tweet if >15 min downtime

---

### 2. High Error Rate (> 50 errors/min)

**Symptoms:** Sentry showing spike in errors, user complaints in support.

**Diagnosis:**
1. Open Sentry → Issues — identify top error by frequency
2. Check `/api/health` → look at `database.status` and `slowQueries`
3. Review recent Vercel deployment (did this start after a deploy?)

**Mitigation steps:**

1. **If caused by a specific API route:** Add a feature flag or temporarily redirect
2. **If database slow queries causing timeouts:**
   - Check `checks.slowQueries.sinceLastRestart` in `/api/health`
   - Review slow query logs in Supabase dashboard → Logs → Postgres
3. **If AI generation failing:** Check `ANTHROPIC_API_KEY` validity and Anthropic status page
4. **Enable maintenance mode** if error rate is user-facing:
   ```bash
   POST /api/admin/maintenance
   ```
5. **Roll back** the last deployment if error started post-deploy

---

### 3. Database Issues

#### 3a. Low Disk Space

**Symptoms:** `/api/health` returns `diskStatus: "warning"` or `"critical"`.

**Immediate actions:**
1. Run cleanup cron manually:
   ```bash
   curl https://buildflow-ai.app/api/cron/cleanup-previews \
     -H "Authorization: Bearer $CRON_SECRET"
   ```
2. In Supabase dashboard → Table Editor → identify large tables
3. Delete soft-deleted records if any:
   ```sql
   -- Run in Supabase SQL editor
   DELETE FROM "Project" WHERE "deletedAt" < NOW() - INTERVAL '30 days';
   ```
4. **Upgrade Supabase plan** if at capacity (free tier = 500MB, Pro = 8GB)

#### 3b. Connection Pool Exhaustion

**Symptoms:** `FATAL: remaining connection slots are reserved`, `/api/health` shows high connection count.

**Actions:**
1. Supabase dashboard → Settings → Database → enable **pgBouncer** in Transaction mode
2. Restart the Vercel deployment to recycle serverless function connections
3. Check for long-running queries in Supabase → Logs → Postgres

---

### 4. Data Breach Suspected

> **This is a P1 — wake up everyone.**

**Indicators:** Unusual data access patterns in Supabase logs, Sentry security alerts, user reports of unauthorized access.

**Immediate steps (within 1 hour):**

1. **Force logout all users** (invalidates all sessions):
   ```bash
   # Dry run first — see how many sessions will be revoked
   curl https://buildflow-ai.app/api/admin/sessions/revoke-all?exceptAdmins=true \
     -H "Cookie: <admin-session-cookie>"

   # Execute revocation
   curl -X POST https://buildflow-ai.app/api/admin/sessions/revoke-all \
     -H "Cookie: <admin-session-cookie>" \
     -H "Content-Type: application/json" \
     -d '{"reason": "Data breach response — forced re-authentication", "exceptAdmins": false}'
   ```

2. **Rotate all API keys** (see Key Rotation section below):
   - `NEXTAUTH_SECRET` — generates new JWT signing key (all existing JWTs invalid)
   - `DATABASE_URL` / `DIRECT_URL` — rotate Supabase password
   - `ANTHROPIC_API_KEY`
   - `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `RESEND_API_KEY`

3. **Enable maintenance mode** while investigation is ongoing.

4. **Preserve evidence:** Export Supabase audit logs before they roll off.

5. **Notify affected users within 72 hours** (GDPR Article 33):
   - Email: "We detected unauthorized access to [X] accounts on [date]..."
   - Specify: what data was accessed, what we did, what users should do

6. **File GDPR report** (if EU users affected): https://gdpr.eu/supervisory-authority/

**See also:** `SECURITY_ROTATION_CHECKLIST.md` in the repo root.

---

### 5. Payment Failures

**Symptoms:** Users can't upgrade, credits not applied, Stripe webhook errors.

**Diagnosis:**
1. Stripe dashboard → Developers → Webhooks → check recent delivery failures
2. Check `/api/health` for database issues (webhook handler needs DB)
3. Review Sentry for `stripe/webhook` route errors

**Mitigation:**

1. **If webhook not reaching server:** Verify `STRIPE_WEBHOOK_SECRET` matches the Stripe endpoint secret
2. **If webhook processed but DB failed:** Stripe auto-retries for up to 3 days. Force retry:
   ```bash
   # Via cron endpoint
   curl https://buildflow-ai.app/api/cron/webhook-retries \
     -H "Authorization: Bearer $CRON_SECRET"
   ```
3. **Manually apply credits** for affected users via admin panel or Supabase SQL editor:
   ```sql
   UPDATE "User"
   SET "credits" = "credits" + 100
   WHERE email = 'user@example.com';
   ```
4. **If Stripe is down:** Check https://status.stripe.com — payments will resume automatically when restored.

---

### 6. AI Generation Down

**Symptoms:** "Generate" button times out, streaming stops, users report blank previews.

**Diagnosis:**
1. Check https://status.anthropic.com
2. Test with a minimal API call:
   ```bash
   curl -X POST https://api.anthropic.com/v1/messages \
     -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "anthropic-version: 2023-06-01" \
     -H "content-type: application/json" \
     -d '{"model":"claude-haiku-4-5-20251001","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'
   ```
3. Check if rate limit hit: Anthropic dashboard → Usage

**Mitigation:**
1. **If Anthropic is down:** Enable maintenance mode, post status update
2. **If rate limited:** Anthropic dashboard → request limit increase
3. **If key invalid:** Rotate key (see Key Rotation below)

---

### 7. Key Rotation

**When:** Data breach, key exposure in logs/commits, or routine rotation (every 90 days).

**Process:**

1. Generate new value for each key
2. **Update Vercel env vars**: Dashboard → Settings → Environment Variables
3. **Re-deploy** to pick up new secrets: `vercel deploy --prod`
4. **Revoke old keys** in each provider's dashboard AFTER new deployment is live

**Order matters for `NEXTAUTH_SECRET`:**
- Changing this invalidates ALL existing sessions immediately
- Do this during maintenance window or expect all users to be logged out

**Full checklist:** `SECURITY_ROTATION_CHECKLIST.md`

---

## Monitoring & Alerting

| Signal | Where to check | Alert threshold |
|--------|---------------|----------------|
| Health check | `/api/health` | Any `unhealthy` status |
| Error rate | Sentry → Issues | > 50/min (configure alert in Sentry) |
| DB disk | `/api/health → database.diskStatus` | `warning` = 80%, `critical` = 100% |
| Redis rate limits | `/api/admin/rate-limits` | `alerting: true` (> 80% blocked) |
| Slow queries | `/api/health → slowQueries` | > 0 critical in last hour |
| Uptime | UptimeRobot / Vercel Analytics | Any downtime > 1 min |
| DB backup | `/api/cron/db-health` (runs 6 AM UTC daily) | backup gap > 25h |

---

## Cron Jobs

| Job | Schedule | Purpose | Manual trigger |
|-----|----------|---------|----------------|
| `cleanup-previews` | `0 */6 * * *` (every 6h) | Delete expired preview HTML from Redis | `GET /api/cron/cleanup-previews` |
| `db-health` | `0 6 * * *` (6 AM UTC) | DB size + backup + alert email | `GET /api/cron/db-health` |
| `webhook-retries` | `*/15 * * * *` (every 15 min) | Retry failed Stripe webhooks | `GET /api/cron/webhook-retries` |
| `drip-emails` | `0 9 * * *` (9 AM UTC) | User onboarding drip emails | `GET /api/cron/drip-emails` |

All cron endpoints require `Authorization: Bearer $CRON_SECRET` header.

---

## Communication Templates

### Status Page / Social Media

**During outage:**
> BuildFlow AI is currently experiencing an outage. Our team is investigating and working to restore service. Updates at [link].

**Resolved:**
> BuildFlow AI service has been restored. We apologize for the disruption. Root cause: [brief description]. We are implementing measures to prevent recurrence.

### User Email (Data Breach)

> Subject: Important Security Notice — Action Required
>
> We detected unauthorized access to BuildFlow AI systems on [date].
>
> **What happened:** [brief description]
>
> **What data was affected:** [specific data types, e.g. "email addresses and hashed passwords"]
>
> **What we've done:** We have [rotated all credentials / force-logged out all users / etc.]
>
> **What you should do:**
> 1. Log back in and change your password
> 2. Enable two-factor authentication if not already enabled
> 3. Review your recent activity in Account Settings
>
> We are deeply sorry for this incident. If you have questions, contact support@buildflow-ai.app.
>
> — The BuildFlow AI Team

---

## Post-Incident Review Template

Fill this out within 24 hours of resolving a P1/P2 incident:

```
## Incident: [title] — [date]

**Severity:** P1 / P2 / P3

**Timeline:**
- HH:MM — First alert / detection
- HH:MM — Incident declared
- HH:MM — Root cause identified
- HH:MM — Fix deployed
- HH:MM — Incident resolved

**Root Cause:**
[What caused this? Be specific.]

**Impact:**
- Duration: X minutes
- Users affected: ~X
- Revenue impact: ~$X

**What went well:**
- [...]

**What could be improved:**
- [...]

**Action items:**
- [ ] Owner: [task] — due [date]
- [ ] Owner: [task] — due [date]
```
