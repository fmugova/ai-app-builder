# Email Service Integration Guide

This guide explains how to set up and use the email service in your application.

## Overview

The email service (`lib/email-service.ts`) provides a unified interface for sending emails with support for multiple providers:

- **Resend** (Recommended) - Simple, modern API with generous free tier
- **SendGrid** - Enterprise-grade with advanced analytics
- **Console** - Development fallback (logs emails to console)

## Quick Setup

### 1. Choose an Email Provider

#### Option A: Resend (Recommended)

1. Sign up at [resend.com](https://resend.com)
2. Get your API key from the dashboard
3. Add to `.env.local`:

```env
RESEND_API_KEY="re_xxxxxxxxxxxxx"
EMAIL_FROM="noreply@yourdomain.com"
CONTACT_EMAIL="support@yourdomain.com"
```

4. Verify your domain in Resend dashboard

#### Option B: SendGrid

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create an API key with "Mail Send" permissions
3. Add to `.env.local`:

```env
SENDGRID_API_KEY="SG.xxxxxxxxxxxxx"
EMAIL_FROM="noreply@yourdomain.com"
CONTACT_EMAIL="support@yourdomain.com"
```

4. Verify your sender domain in SendGrid

### 2. Configure Environment Variables

Copy from `.env.example` and fill in your values:

```env
# Choose ONE provider
RESEND_API_KEY="re_your-key"        # OR
SENDGRID_API_KEY="SG.your-key"      # OR leave both empty for console logging

# Required for all providers
EMAIL_FROM="noreply@yourdomain.com"     # Default sender
CONTACT_EMAIL="support@yourdomain.com"  # Where contact forms go
```

## Usage Examples

### Basic Email Sending

```typescript
import { sendEmail } from '@/lib/email-service'

const result = await sendEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<h1>Hello World</h1>',
  text: 'Hello World'
})

if (result.success) {
  console.log('Email sent:', result.messageId)
} else {
  console.error('Email failed:', result.error)
}
```

### Using Email Templates

```typescript
import { sendEmail, emailTemplates } from '@/lib/email-service'

// Contact form notification
const template = emailTemplates.contactFormNotification({
  name: 'John Doe',
  email: 'john@example.com',
  message: 'I have a question...'
})

await sendEmail({
  to: process.env.CONTACT_EMAIL,
  subject: template.subject,
  html: template.html,
  text: template.text,
  replyTo: 'john@example.com' // Allow direct reply
})

// Newsletter welcome
const welcome = emailTemplates.newsletterWelcome({ name: 'Jane' })
await sendEmail({
  to: 'jane@example.com',
  subject: welcome.subject,
  html: welcome.html,
  text: welcome.text
})

// Password reset
const reset = emailTemplates.passwordReset({
  resetUrl: 'https://yourapp.com/reset?token=abc123',
  name: 'User'
})
await sendEmail({
  to: 'user@example.com',
  subject: reset.subject,
  html: reset.html,
  text: reset.text
})
```

### Advanced Options

```typescript
await sendEmail({
  to: ['user1@example.com', 'user2@example.com'], // Multiple recipients
  subject: 'Important Update',
  html: '<p>Your custom HTML</p>',
  text: 'Plain text version',
  from: 'custom@yourdomain.com',  // Override default
  replyTo: 'support@yourdomain.com',
  cc: ['manager@example.com'],
  bcc: ['archive@example.com']
})
```

### Bulk Email Sending

```typescript
import { sendBulkEmails } from '@/lib/email-service'

const emails = users.map(user => ({
  to: user.email,
  subject: 'Newsletter',
  html: `<h1>Hi ${user.name}</h1>`,
  text: `Hi ${user.name}`
}))

const results = await sendBulkEmails(emails, {
  batchSize: 10,    // Send 10 at a time
  delayMs: 100      // Wait 100ms between batches
})

const successful = results.filter(r => r.success).length
console.log(`Sent ${successful}/${results.length} emails`)
```

## Available Templates

The service includes pre-built templates for common use cases:

1. **Contact Form Notification** - Notify admin of new contact form submissions
2. **Newsletter Welcome** - Welcome new newsletter subscribers
3. **Email Verification** - Send email verification links
4. **Password Reset** - Send password reset links
5. **Admin Notification** - General admin alerts

Each template returns both HTML and plain text versions.

## Email Validation

```typescript
import { isValidEmail } from '@/lib/email-service'

if (!isValidEmail(userInput)) {
  return { error: 'Invalid email address' }
}
```

## API Routes Using Email

### Contact Form (`lib/api-templates.ts`)

Already integrated! Contact form submissions automatically send notifications:

```typescript
const result = await fetch('/api/contact', {
  method: 'POST',
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    message: 'Hello!'
  })
})
```

### Newsletter Subscription (`lib/api-templates.ts`)

Already integrated! New subscribers receive welcome emails:

```typescript
const result = await fetch('/api/newsletter/subscribe', {
  method: 'POST',
  body: JSON.stringify({
    email: 'subscriber@example.com',
    name: 'Jane'
  })
})
```

### Admin Email (`app/api/admin/send-email/route.ts`)

Send custom emails to users (admin only):

```typescript
// Admin only
const result = await fetch('/api/admin/send-email', {
  method: 'POST',
  body: JSON.stringify({
    userId: 'user-id',
    subject: 'Important Notice',
    message: '<p>Your message here</p>'
  })
})
```

## Development Mode

When no email provider is configured, emails are logged to the console:

```
📧 ===== EMAIL (DEVELOPMENT MODE) =====
From: noreply@example.com
To: user@example.com
Subject: Welcome!

--- Content ---
HTML: <h1>Welcome to our platform!</h1>...
Text: Welcome to our platform!
=====================================
```

## Troubleshooting

### Email not sending

1. **Check environment variables**:
   ```bash
   echo $RESEND_API_KEY
   echo $EMAIL_FROM
   ```

2. **Verify domain**:
   - Resend: Dashboard → Domains → Verify
   - SendGrid: Settings → Sender Authentication

3. **Check API key permissions**:
   - Resend: Should have "Sending access"
   - SendGrid: Should have "Mail Send" permission

4. **Review logs**:
   ```typescript
   const result = await sendEmail(...)
   console.log(result) // Check success and error
   ```

### Emails going to spam

1. **Verify your domain** (required for production)
2. **Set up SPF/DKIM records** (provided by email service)
3. **Use plain text version** (always send both HTML and text)
4. **Avoid spam trigger words** in subject/body
5. **Include unsubscribe link** for newsletters

### Rate limits

Both services have rate limits:

- **Resend Free**: 100 emails/day
- **SendGrid Free**: 100 emails/day

Use `sendBulkEmails()` with delays for large batches.

## Production Checklist

- [ ] Email provider API key configured
- [ ] EMAIL_FROM set to verified domain
- [ ] CONTACT_EMAIL configured
- [ ] Domain verified in email service dashboard
- [ ] SPF/DKIM records added to DNS
- [ ] Tested sending from production
- [ ] Unsubscribe links added to marketing emails
- [ ] Error handling in place (emails shouldn't crash requests)

## Cost Estimates

### Resend Pricing
- **Free**: 100 emails/day, 1 domain
- **Pro** ($20/mo): 50,000 emails/month, unlimited domains
- **Business**: Custom pricing

### SendGrid Pricing
- **Free**: 100 emails/day
- **Essentials** ($15/mo): 50,000 emails/month
- **Pro** ($90/mo): 1.5M emails/month

Both offer pay-as-you-go options for higher volumes.

## Security Best Practices

1. **Never expose API keys client-side**
2. **Validate email addresses** before sending
3. **Rate limit** email endpoints to prevent abuse
4. **Use environment variables** for all config
5. **Sanitize user input** in email content
6. **Don't send sensitive data** in emails
7. **Enable 2FA** on email service accounts
8. **Monitor sending** for unusual spikes

## Next Steps

1. Set up your email provider account
2. Add API key to `.env.local`
3. Verify your sending domain
4. Test with a simple email
5. Enable email verification in `proxy.ts` (optional)
6. Customize email templates as needed
7. Set up monitoring/alerts for failed emails

For more help, see provider documentation:
- [Resend Docs](https://resend.com/docs)
- [SendGrid Docs](https://docs.sendgrid.com)
