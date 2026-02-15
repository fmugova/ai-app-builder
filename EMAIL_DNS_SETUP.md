# BuildFlow AI — Email DNS Setup Guide

> Domain: `buildflow-ai.app`
> Email provider: **Resend** (sending) + **Resend Inbound** (receiving)

---

## Part 1: Sending — SPF, DKIM, DMARC

These records prove to Gmail/Outlook that emails *from* `@buildflow-ai.app` are legitimate.
Without them, your transactional emails land in spam.

Add these in your DNS provider (Cloudflare, Namecheap, Route53, etc.):

### 1.1 SPF Record
Tells receivers that Resend is allowed to send on your behalf.

| Type | Name | Value | TTL |
|------|------|-------|-----|
| TXT | `@` (or `buildflow-ai.app`) | `v=spf1 include:amazonses.com ~all` | 3600 |

> Resend uses Amazon SES infrastructure. If you also send from another provider, chain them:
> `v=spf1 include:amazonses.com include:_spf.google.com ~all`

### 1.2 DKIM Records (from Resend dashboard)
Resend generates 3 DKIM CNAME records per domain. Get your exact values from:
**Resend Dashboard → Domains → buildflow-ai.app → DNS Records**

They will look like this (your values will differ):

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | `resend._domainkey` | `resend._domainkey.amazonses.com` | 3600 |
| CNAME | `s1._domainkey` | `s1.domainkey.u12345678.wl234.sendgrid.net` | 3600 |
| CNAME | `s2._domainkey` | `s2.domainkey.u12345678.wl234.sendgrid.net` | 3600 |

> **Copy the exact values from Resend** — do not use the examples above.

### 1.3 DMARC Record
Tells receivers what to do with emails that fail SPF/DKIM. Start with `p=none` (monitor only), then tighten after confirming delivery.

| Type | Name | Value | TTL |
|------|------|-------|-----|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@buildflow-ai.app; ruf=mailto:dmarc@buildflow-ai.app; fo=1` | 3600 |

**Tighten after 2–4 weeks** (once you see no failures in DMARC reports):
- `p=quarantine` → failed emails go to spam
- `p=reject` → failed emails are blocked entirely

---

## Part 2: Receiving — MX Records

MX records tell the internet where to deliver emails addressed to `@buildflow-ai.app`.

### Option A: Resend Inbound (Recommended — already integrated in code)

Resend can receive emails and webhook them to `/api/email/inbound`, which forwards to your real inbox.

**Step 1 — Add MX record:**

| Type | Name | Priority | Value | TTL |
|------|------|----------|-------|-----|
| MX | `@` | `10` | `inbound.resend.com` | 3600 |

**Step 2 — Configure in Resend dashboard:**
1. Go to **Resend → Domains → buildflow-ai.app → Inbound**
2. Enable inbound routing
3. Add route:
   - **Pattern:** `support@buildflow-ai.app` (or `*@buildflow-ai.app` for all addresses)
   - **Webhook URL:** `https://buildflow-ai.app/api/email/inbound`
4. Copy the webhook secret → add to Vercel env: `RESEND_WEBHOOK_SECRET=xxxxx`

**Step 3 — Set your real inbox as the forwarding target:**
```
SUPPORT_INBOX_EMAIL="your-personal@gmail.com"  # add to Vercel env vars
```

**Result:** Anyone emailing `support@buildflow-ai.app` → Resend receives it → webhooks your app → your app re-sends it to your Gmail.

---

### Option B: Cloudflare Email Routing (Simpler, if domain is on Cloudflare)

No code needed — Cloudflare handles all forwarding at the DNS layer.

1. Cloudflare Dashboard → **Email → Email Routing → Enable**
2. Add routing rule:
   - `support@buildflow-ai.app` → `your-gmail@gmail.com`
   - `hello@buildflow-ai.app` → `your-gmail@gmail.com`
   - `billing@buildflow-ai.app` → `your-gmail@gmail.com`
   - Or: Catch-all `*@buildflow-ai.app` → `your-gmail@gmail.com`
3. Cloudflare adds MX records automatically

**MX records Cloudflare adds:**

| Type | Name | Priority | Value |
|------|------|----------|-------|
| MX | `@` | `13` | `route1.mx.cloudflare.net` |
| MX | `@` | `28` | `route2.mx.cloudflare.net` |
| MX | `@` | `58` | `route3.mx.cloudflare.net` |

---

### Option C: Zoho Mail Free (If you want a real inbox at buildflow-ai.app)

Free for up to 5 users, gives you a proper inbox you log into.

1. Sign up at [zoho.com/mail](https://zoho.com/mail) → Add Domain
2. Add their MX records:

| Type | Name | Priority | Value | TTL |
|------|------|----------|-------|-----|
| MX | `@` | `10` | `mx.zoho.com` | 3600 |
| MX | `@` | `20` | `mx2.zoho.com` | 3600 |
| MX | `@` | `50` | `mx3.zoho.com` | 3600 |

---

## Part 3: Complete DNS Checklist

| Record | Status | Notes |
|--------|--------|-------|
| SPF TXT | ☐ | `v=spf1 include:amazonses.com ~all` |
| DKIM CNAME ×3 | ☐ | Copy from Resend dashboard |
| DMARC TXT | ☐ | Start with `p=none` |
| MX (receiving) | ☐ | Resend / Cloudflare / Zoho |
| Vercel custom domain | ☐ | buildflow-ai.app → Vercel CNAME |
| www redirect | ☐ | www → buildflow-ai.app (Vercel handles this) |

---

## Part 4: Environment Variables Required

Add to **Vercel Dashboard → Settings → Environment Variables**:

```bash
# The inbox that receives contact form notifications and forwarded inbound emails
SUPPORT_INBOX_EMAIL="your-personal@gmail.com"

# Resend inbound webhook signature (from Resend → Domains → Inbound → Signing Secret)
RESEND_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxxxxxxxxx"

# From addresses (already in .env.example)
RESEND_NOREPLY_EMAIL="BuildFlow <noreply@buildflow-ai.app>"
RESEND_SUPPORT_EMAIL="BuildFlow Support <support@buildflow-ai.app>"
RESEND_BILLING_EMAIL="BuildFlow Billing <billing@buildflow-ai.app>"
RESEND_MARKETING_EMAIL="BuildFlow Team <marketing@buildflow-ai.app>"
```

---

## Part 5: Verify Everything Is Working

**Test SPF/DKIM/DMARC:**
- Send a test email from Resend dashboard → Check delivery in Gmail → Click "Show original" → Verify `dkim=pass`, `spf=pass`
- Use [mail-tester.com](https://mail-tester.com) — send a test email, get a score (aim for 10/10)
- Use [mxtoolbox.com](https://mxtoolbox.com) → Enter `buildflow-ai.app` → Check SPF, DKIM, DMARC

**Test receiving:**
- Send a test email to `support@buildflow-ai.app` from Gmail
- Check that it arrives in your forwarding inbox within 1–2 minutes
- Check Resend Dashboard → Inbound → Recent messages

**Test contact form:**
- Visit `https://buildflow-ai.app/contact`
- Fill in the form and submit
- You should receive a notification at `SUPPORT_INBOX_EMAIL`
- The sender should receive a confirmation email

---

## Part 6: DNS Propagation

After adding records, changes propagate in 15 min – 48 hours.

Check propagation globally: [whatsmydns.net](https://whatsmydns.net)
- Enter `buildflow-ai.app` → Select record type (TXT, MX) → Check

Usually Cloudflare propagates in < 5 min. Other registrars may take a few hours.
