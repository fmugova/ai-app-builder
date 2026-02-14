# 🔒 Security: Credential Rotation Required

## Exposed Credentials (Need Rotation)

### ⚠️ HIGH PRIORITY
- [ ] **Vercel API Token** - Create new at: https://vercel.com/account/tokens
- [ ] **NextAuth Secret** - Generate new: `openssl rand -base64 32`
- [ ] **Database Password** - Rotate in Supabase dashboard
- [ ] **Stripe Keys** - Regenerate in Stripe dashboard (if concerned)

### Steps to Rotate:

#### 1. Vercel API Token
```bash
# 1. Go to: https://vercel.com/account/tokens
# 2. Delete old token: "BuildFlow Production"
# 3. Create new token with same permissions
# 4. Update in .env.local:
VERCEL_API_TOKEN="<new_token>"
VERCEL_TOKEN="<new_token>"
```

#### 2. NextAuth Secret
```bash
# Generate new secret
openssl rand -base64 32

# Update in .env.local:
NEXTAUTH_SECRET="<new_value>"

# Update in Vercel:
vercel env rm NEXTAUTH_SECRET
vercel env add NEXTAUTH_SECRET production
# Paste the new value when prompted
```

#### 3. Database Credentials (Supabase)
```
1. Go to: https://supabase.com/dashboard/project/<project>/settings/database
2. Reset database password
3. Update DATABASE_URL and DIRECT_URL in:
   - .env.local (local development)
   - Vercel environment variables (production)
```

#### 4. After Rotation
```bash
# Redeploy to production with new credentials
vercel --prod

# Test authentication locally
npm run dev
```

## 📋 Best Practices Going Forward

1. ✅ **Never commit** `.env.local` to git (already in .gitignore)
2. ✅ **Use environment variable management** tools (Vercel, 1Password, etc.)
3. ✅ **Rotate secrets regularly** (every 90 days minimum)
4. ✅ **Use restricted keys** when available (like Stripe restricted keys)
5. ✅ **Monitor access logs** for suspicious activity

## 🔍 Verification After Rotation

- [ ] Local development works (`npm run dev`)
- [ ] Production deployment successful
- [ ] Authentication works in production
- [ ] Database connections work
- [ ] No errors in Vercel logs
