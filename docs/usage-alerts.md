# Usage Alerts System

## Overview
Automated email alerts sent to users when they approach or reach their usage limits.

## Alert Thresholds

### Warning Alerts (80% usage)
- **Project Limit**: Sent at 80% of monthly project limit
- **Generation Limit**: Sent at 80% of monthly AI generation limit

### Critical Alerts (100% usage)
- **Project Limit Reached**: Sent when user hits project limit
- **Generation Limit Reached**: Sent when user hits generation limit

## Email Templates

All emails include:
- Beautiful HTML design matching BuildFlow brand
- Usage progress bar visualization
- Upgrade CTA for free tier users
- Account management link for paid users

## Integration Points

### Automatic Triggers
Alerts are automatically checked after:

1. **AI Generation** (`/api/generate`)
   - Increments `generationsUsed`
   - Triggers alert check

2. **Project Creation** (`/api/projects`)
   - Increments `projectsThisMonth`
   - Triggers alert check

3. **Project Duplication** (`/api/projects/[id]/duplicate`)
   - Increments `projectsThisMonth`
   - Triggers alert check

### Manual Trigger
For testing purposes:
```bash
POST /api/user/check-usage-alerts
```

## Testing

### Test with Browser Console
```javascript
// Trigger usage alert check
fetch('/api/user/check-usage-alerts', { 
  method: 'POST' 
}).then(r => r.json()).then(console.log)
```

### Simulate High Usage (Database)
Update user directly to test alerts:

```sql
-- Set to 80% of limit (should trigger warning)
UPDATE "public"."User" 
SET "generationsUsed" = 8 
WHERE email = 'your@email.com';

-- Set to 100% of limit (should trigger critical alert)
UPDATE "public"."User" 
SET "generationsUsed" = 10 
WHERE email = 'your@email.com';
```

Then trigger check:
```javascript
fetch('/api/user/check-usage-alerts', { method: 'POST' })
```

## Alert Prevention

Alerts are NOT sent if:
- User doesn't have an email
- Usage is below 80%
- User has already received alert (would need alert tracking table)

## Future Enhancements

1. **Alert Tracking**: Add table to prevent duplicate alerts
   ```prisma
   model UsageAlert {
     id        String   @id @default(cuid())
     userId    String
     alertType String   // 'project_80' | 'generation_80' | etc
     sentAt    DateTime @default(now())
   }
   ```

2. **User Preferences**: Allow users to opt-in/opt-out
3. **Slack/Discord Integration**: Send alerts to team channels
4. **Weekly Summary**: Email with usage trends

## Email Preview

### Warning Email (80%)
- Subject: "⚠️ You're approaching your [project/generation] limit"
- Color: Orange gradient
- CTA: "Upgrade Now" (free) or "View Account" (paid)

### Critical Email (100%)
- Subject: "🚨 You've reached your [project/generation] limit"
- Color: Red gradient
- CTA: "Upgrade Now" (free) or "View Plans" (paid)

## Performance

- Non-blocking: Alert checks run asynchronously
- Error handling: Failed alerts don't break main flow
- Logging: All alerts logged to console for monitoring
