# Drip Email Campaign System

## Overview

BuildFlow includes an automated drip email campaign system that sends targeted onboarding emails to free-tier users based on their signup date.

## Email Schedule

The onboarding campaign sends 5 emails over 14 days:

| Day | Email | Subject | Purpose |
|-----|-------|---------|---------|
| 0 | Welcome | 🎉 Welcome to BuildFlow! | Introduce the platform and quick start guide |
| 1 | First Project | 🚀 Create your first project | Encourage project creation with examples |
| 3 | Customize | 🎨 Customize your design like a pro | Teach customization features |
| 7 | Upgrade Prompt | ⚡ Ready to unlock unlimited potential? | Present Pro/Business plans |
| 14 | Pro Showcase | 💎 See what Pro users are building | Social proof and special offer |

## How It Works

### 1. Automatic Scheduling

- Emails are sent via Vercel Cron running every 6 hours (`0 */6 * * *`)
- Only sends to users on the **free tier** who signed up in the last 30 days
- Tracks which emails have been sent to prevent duplicates

### 2. Smart Content

- **Day 1 email** adapts based on whether user has created projects
- **Day 7 email** includes actual usage stats (projects & generations)
- All emails are personalized with user's name

### 3. Duplicate Prevention

- Uses `DripEnrollment` model to track sent emails
- Stores sent emails as JSON: `{ "day0_welcome": "2026-01-06T..." }`
- Never sends the same email twice to a user

## Setup

### 1. Environment Variables

Add to your Vercel environment:

```bash
CRON_SECRET="your-random-secret-string"
```

Generate a secure secret:
```bash
openssl rand -base64 32
```

### 2. Vercel Cron Configuration

Already configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/drip-emails",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### 3. Manual Testing

Admin users can manually trigger the processor:

```bash
POST /api/admin/trigger-drip
```

Or use the DripEmailTester component in the admin dashboard.

## API Endpoints

### `/api/cron/drip-emails` (POST)

Processes and sends scheduled drip emails.

**Authentication:** Requires `Authorization: Bearer {CRON_SECRET}` header

**Response:**
```json
{
  "success": true,
  "processed": 5,
  "details": [
    {
      "email": "user@example.com",
      "type": "welcome",
      "day": 0,
      "status": "sent"
    }
  ]
}
```

### `/api/admin/trigger-drip` (POST)

Manually triggers the drip email processor (admin only).

**Response:**
```json
{
  "success": true,
  "message": "Drip emails triggered successfully",
  "details": { ... }
}
```

## Database Schema

### DripEnrollment

```prisma
model DripEnrollment {
  id             String       @id
  campaignId     String       // "onboarding"
  userEmail      String
  userId         String
  enrolledAt     DateTime     @default(now())
  completedAt    DateTime?
  unsubscribedAt DateTime?
  emailsSent     Json?        // Tracks which emails were sent
  
  DripCampaign   DripCampaign @relation(...)
  User           User         @relation(...)
}
```

## Email Templates

All templates are in `lib/drip-email-templates.ts`:

- `getWelcomeEmailContent(userName)` - Day 0
- `getFirstProjectEmailContent(userName, hasProjects)` - Day 1
- `getCustomizeEmailContent(userName)` - Day 3
- `getUpgradePromptEmailContent(userName, generationsUsed, projectsCount)` - Day 7
- `getProShowcaseEmailContent(userName)` - Day 14

### Customizing Templates

Edit the templates in `lib/drip-email-templates.ts`. Each template:
- Uses responsive HTML with inline styles
- Includes gradient headers and clear CTAs
- Mobile-optimized layout

## Monitoring

### Check Logs

In Vercel dashboard, check cron logs:
1. Go to your project → Deployments
2. Click on a deployment → Functions
3. Find `/api/cron/drip-emails`
4. View execution logs

### Manual Testing

Use the admin dashboard to:
1. View which users are eligible
2. Trigger emails manually
3. See processing results in real-time

## Best Practices

### 1. Email Deliverability

- Ensure Resend account is properly configured
- Use a verified domain for sender address
- Monitor spam complaints

### 2. Content Updates

- Regularly update templates based on user feedback
- A/B test subject lines
- Keep content concise and actionable

### 3. Timing Optimization

- Current schedule: Every 6 hours
- Adjust `schedule` in `vercel.json` if needed
- Consider time zones for better open rates

### 4. User Exclusions

Currently excludes:
- Paid subscribers (Pro/Business users)
- Users older than 30 days
- Users without email addresses

To add more exclusions, update the query in `/api/cron/drip-emails/route.ts`.

## Troubleshooting

### Emails Not Sending

1. **Check CRON_SECRET**: Ensure it's set in Vercel environment
2. **Verify Cron Job**: Check Vercel cron logs for errors
3. **Check Resend**: Ensure API key is valid and has quota
4. **Database Connection**: Verify Prisma can connect to database

### Duplicate Emails

- Check `DripEnrollment.emailsSent` field
- Ensure enrollment records are being created/updated

### Testing Locally

Run manually:
```bash
curl -X POST http://localhost:3000/api/admin/trigger-drip \
  -H "Authorization: Bearer your-session-token"
```

## Extending the System

### Add New Emails

1. Add to `DRIP_SCHEDULE` in `/api/cron/drip-emails/route.ts`:
```typescript
{ day: 21, subject: 'Your subject', type: 'your-type' }
```

2. Create template in `lib/drip-email-templates.ts`:
```typescript
export function getYourTemplateContent(userName: string) {
  // Your template
}
```

3. Add case to switch statement in the processor

### Create Additional Campaigns

The system supports multiple campaigns:
1. Create campaign in `DripCampaign` table
2. Create emails in `DripEmail` table
3. Update processor to handle new campaign

## Analytics

Track email performance:
- Open rates (requires email tracking pixels)
- Click-through rates (use UTM parameters)
- Conversion to paid plans

Add tracking to email templates with:
```html
<img src="https://yourapp.com/api/track/open?email=...&campaign=..." width="1" height="1" />
```

## Privacy & Compliance

- Users can unsubscribe via account settings
- Respect unsubscribe requests immediately
- Include unsubscribe link in emails (future enhancement)
- GDPR compliant: only sends to users who created accounts
