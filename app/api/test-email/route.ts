export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, getWelcomeEmailHTML } from '@/lib/email'

export async function GET(request: NextRequest) {
  try {
    const result = await sendEmail({
      to: 'fmugova@yahoo.com', // Your email
      subject: 'Test Email from BuildFlow',
      html: getWelcomeEmailHTML('Test User')
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 })
  }
}
```

**Test it:**
Visit: https://buildflow-ai.app/api/test-email

Check your inbox at fmugova@yahoo.com

**Delete this file after testing!**

---

### Method 2: Test by Signing Up

1. Go to: https://buildflow-ai.app
2. Sign up with a new email
3. Check that email's inbox
4. You should receive a welcome email!

---

## 📧 Verify Domain in Resend

For production, you should verify your domain:

1. Go to: https://resend.com/domains
2. Click "Add Domain"
3. Enter: `buildflow-ai.app`
4. Add the DNS records they provide
5. Wait for verification (usually 5-10 minutes)

**DNS Records to add (example):**
```
Type: TXT
Name: _resend
Value: resend-verify=xxxxx

Type: MX
Name: @
Value: feedback-smtp.resend.com
Priority: 10