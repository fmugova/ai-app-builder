# Install Required Dependencies

Run these commands to install the necessary packages for OAuth and 2FA:

```bash
npm install qrcode speakeasy
npm install --save-dev @types/qrcode @types/speakeasy
```

# Environment Variables

Add these to your `.env` file (and update in Vercel):

```env
# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# GitHub OAuth
GITHUB_CLIENT_ID="your-github-client-id"  
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Email (if not already set)
RESEND_API_KEY="your-resend-api-key"
```

## Setup OAuth Credentials

### Google OAuth
1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Set authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-domain.com/api/auth/callback/google` (production)

### GitHub OAuth
1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Set Authorization callback URL:
   - `http://localhost:3000/api/auth/callback/github` (development)
   - `https://your-domain.com/api/auth/callback/github` (production)

# Database Migration

After updating the schema, run:

```bash
npx prisma migrate dev --name add-2fa-and-password-reset
npx prisma generate
```

# Testing

## 1. Password Reset
- Go to `/auth/forgot-password`
- Enter your email
- Check email for reset link
- Click link and set new password

## 2. OAuth Login
- Go to `/auth/signin`
- Click "GitHub" or "Google" button
- Authorize the app
- You'll be redirected back and logged in

## 3. Two-Factor Authentication
- Sign in to your account
- Go to settings (implement in settings page)
- Enable 2FA
- Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
- Enter 6-digit code to verify

# Next Steps

You need to add 2FA UI to the settings page. Here's what to add to `/app/settings/page.tsx`:

1. Display 2FA status
2. Button to enable/disable 2FA
3. Show QR code when setting up
4. Input field for verification code
5. Backup codes (optional but recommended)

Would you like me to create the settings page UI for 2FA management?
