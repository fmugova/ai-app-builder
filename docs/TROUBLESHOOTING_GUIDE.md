# 🔧 Troubleshooting Guide

Complete guide to solving common issues with BuildFlow AI, API generation, and Supabase integration.

---

## Table of Contents

1. [Supabase Connection Issues](#supabase-connection-issues)
2. [API Generation Problems](#api-generation-problems)
3. [Deployment Issues](#deployment-issues)
4. [Database & Schema Issues](#database--schema-issues)
5. [Authentication Problems](#authentication-problems)
6. [Performance Issues](#performance-issues)

---

## Supabase Connection Issues

### ❌ "Connection Test Failed"

**Symptoms:**
- Red error message when testing Supabase connection
- Message: "Connection failed. Please verify your credentials."

**Causes & Solutions:**

1. **Incorrect Project URL**
   ```
   ❌ Wrong: https://supabase.com/dashboard/project/abc123
   ❌ Wrong: supabase.co/project/abc123
   ✅ Correct: https://abc123.supabase.co
   ```
   
   **Fix:** Copy the **Project URL** from Settings → API, not your browser address bar

2. **Wrong API Key**
   - Make sure you're copying the **anon/public** key, not the service_role key
   - The anon key usually starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`
   
   **Fix:** Go to Settings → API, copy the full anon key (it's very long!)

3. **Extra Spaces or Characters**
   - Hidden spaces at the beginning or end
   - Line breaks in the middle of keys
   
   **Fix:** 
   - Use the copy button in Supabase Dashboard
   - Paste into a text editor first to check for issues
   - Trim any whitespace

4. **Project Not Fully Provisioned**
   - New Supabase projects take 1-2 minutes to set up
   
   **Fix:** Wait a few minutes and try again

5. **Network/Firewall Issues**
   - VPN blocking connection
   - Corporate firewall
   
   **Fix:** Try from a different network or disable VPN temporarily

---

### ❌ "Invalid Supabase URL format"

**Solution:**
Your URL should match this pattern:
```
https://[project-ref].supabase.co
```

Common errors:
- Missing `https://`
- Extra path after `.co` (like `/dashboard`)
- Using `.com` instead of `.co`

---

### ❌ "Anon key appears to be invalid"

**Solution:**
The anon key should be:
- Very long (hundreds of characters)
- Starts with `eyJhbGci...`
- No spaces or line breaks

**Verify:**
1. Go to Supabase Dashboard → Settings → API
2. Find "Project API keys" section
3. Copy the key labeled `anon` or `public`
4. It should be under "anon public" NOT "service_role"

---

## API Generation Problems

### ❌ "Code validation failed"

**Symptoms:**
- Red validation errors after generation
- Code won't save

**Common Errors & Fixes:**

1. **Missing NextRequest/NextResponse imports**
   ```typescript
   // Add this at the top
   import { NextRequest, NextResponse } from 'next/server'
   ```

2. **Missing try-catch error handling**
   ```typescript
   export async function POST(request: NextRequest) {
     try {
       // Your code here
       return NextResponse.json({ success: true })
     } catch (error) {
       console.error('Error:', error)
       return NextResponse.json(
         { error: 'Internal server error' },
         { status: 500 }
       )
     }
   }
   ```

3. **Missing HTTP status codes**
   ```typescript
   // ❌ Wrong
   return NextResponse.json({ error: 'Not found' })
   
   // ✅ Correct
   return NextResponse.json({ error: 'Not found' }, { status: 404 })
   ```

4. **Missing auth imports when using authentication**
   ```typescript
   import { getServerSession } from 'next-auth'
   import { authOptions } from '@/lib/auth'
   ```

**Prevention:** Be very specific in your endpoint description about imports needed.

---

### ❌ Generated code is incomplete

**Symptoms:**
- Code cuts off mid-function
- Missing closing braces
- Incomplete imports

**Causes:**
- Description was too complex
- Too many features in one endpoint
- AI hit token limit

**Solutions:**

1. **Break into smaller endpoints**
   ```
   Instead of: "Create endpoint that handles user registration, 
                email verification, profile setup, and avatar upload"
   
   Do: Create 3 separate endpoints:
   - POST /api/auth/register (basic registration)
   - POST /api/auth/verify-email
   - POST /api/user/profile
   ```

2. **Simplify description**
   - Focus on core functionality
   - Add advanced features later

3. **Regenerate**
   - Click "Back" and try again with simpler requirements

---

### ❌ "Failed to generate endpoint"

**Symptoms:**
- Error message immediately
- No code generated

**Solutions:**

1. **Check your API keys**
   - Verify Anthropic API key is set in environment variables
   - Check BuildFlow dashboard for API quota

2. **Try simpler description first**
   ```
   Start with: "Create a GET endpoint that returns a hello world message"
   Then: Add complexity incrementally
   ```

3. **Check network connection**
   - Ensure stable internet
   - Try again in a few minutes

---

### ❌ Validation warnings (yellow)

Warnings don't prevent creation but indicate improvements:

**"Consider adding Zod for input validation"**
```typescript
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

const { email, password } = schema.parse(await request.json())
```

**"Add rate limiting for state-changing operations"**
- Consider this for production
- Implement using middleware or libraries like `rate-limiter-flexible`

**"Consider sanitizing user inputs"**
```typescript
import { escape } from 'lodash'
const safeName = escape(userInput)
```

---

## Database & Schema Issues

### ❌ "Failed to create table"

**Symptoms:**
- Error when creating table in Supabase
- SQL execution fails

**Solutions:**

1. **Table already exists**
   ```sql
   -- Check existing tables in Supabase SQL Editor
   SELECT tablename FROM pg_tables WHERE schemaname = 'public';
   ```
   **Fix:** Use a different table name or delete existing table

2. **Invalid table/column names**
   ```
   ❌ Wrong: "User-Data", "first name", "user's email"
   ✅ Correct: "user_data", "first_name", "user_email"
   ```
   **Rules:**
   - Lowercase only
   - Use underscores, not spaces or hyphens
   - Start with a letter
   - No special characters

3. **Invalid column type**
   - Make sure you're using valid PostgreSQL types
   - Common types: TEXT, INTEGER, UUID, BOOLEAN, TIMESTAMPTZ, JSONB

4. **Missing primary key**
   - Every table needs a primary key
   - Usually: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`

**Workaround:**
If auto-creation fails:
1. Copy the generated SQL
2. Go to Supabase Dashboard → SQL Editor
3. Paste and execute manually
4. Check for error messages

---

### ❌ Row Level Security (RLS) blocking queries

**Symptoms:**
- Queries return empty results
- Error: "Row level security policy violation"

**Understanding:**
- RLS is Supabase's security feature
- Prevents unauthorized data access
- Policies control who can read/write

**Solutions:**

1. **Check if RLS is enabled**
   ```sql
   -- Disable RLS for testing (NOT production!)
   ALTER TABLE "your_table" DISABLE ROW LEVEL SECURITY;
   ```

2. **Create proper policies**
   ```sql
   -- Allow authenticated users to read their own data
   CREATE POLICY "users_read_own"
     ON "user_data"
     FOR SELECT
     USING (auth.uid() = user_id);
   
   -- Allow anyone to read public posts
   CREATE POLICY "posts_public_read"
     ON "posts"
     FOR SELECT
     USING (is_public = true);
   ```

3. **Use service_role key for admin operations**
   - Service role bypasses RLS
   - Only use server-side!
   - Never expose in client code

**Reference:** [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)

---

## Authentication Problems

### ❌ "Unauthorized" (401 errors)

**Symptoms:**
- API returns 401
- Can't access protected endpoints

**Solutions:**

1. **Not logged in**
   - Check session exists: `const session = await getServerSession(authOptions)`
   - If `null`, user isn't logged in

2. **Session expired**
   - Sessions expire after period of inactivity
   - Re-authenticate user

3. **Wrong auth check**
   ```typescript
   // ❌ Wrong
   if (!session) {
     return NextResponse.json({ error: 'Unauthorized' })
   }
   
   // ✅ Correct
   if (!session?.user?.id) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
   }
   ```

---

### ❌ "Forbidden" (403 errors)

**Symptoms:**
- Logged in but can't access resource
- Different from 401

**Causes:**
- User doesn't own the resource
- Missing required role/permission

**Solution:**
```typescript
// Check ownership
const resource = await prisma.post.findUnique({
  where: { id: postId }
})

if (resource.authorId !== session.user.id) {
  return NextResponse.json(
    { error: 'Forbidden: You do not own this resource' },
    { status: 403 }
  )
}
```

---

## Deployment Issues

### ❌ Environment variables not set

**Symptoms:**
- Works locally but fails in production
- "Missing API key" errors

**Solution:**

1. **Vercel:**
   ```bash
   # In Vercel Dashboard → Project → Settings → Environment Variables
   Add:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_KEY (optional)
   - DATABASE_URL
   - NEXTAUTH_SECRET
   - NEXTAUTH_URL
   ```

2. **Redeploy after adding env vars**
   - Click "Redeploy" in Vercel dashboard
   - Or push new commit

---

### ❌ Database connection fails in production

**Causes:**
- Wrong DATABASE_URL
- Firewall blocking
- SSL certificate issues

**Solutions:**

1. **Check DATABASE_URL format**
   ```
   postgresql://user:password@host:5432/database?sslmode=require
   ```

2. **Enable connection pooling**
   - Use Supabase's connection pooler
   - Update DATABASE_URL to use pooler URL

3. **Check SSL settings**
   - Ensure `?sslmode=require` is in URL

---

## Performance Issues

### ❌ Slow API responses

**Symptoms:**
- Requests take >3 seconds
- Timeouts

**Solutions:**

1. **Add database indexes**
   ```sql
   CREATE INDEX "posts_author_id_idx" ON "posts"("author_id");
   CREATE INDEX "posts_created_at_idx" ON "posts"("created_at");
   ```

2. **Use pagination**
   ```typescript
   const posts = await prisma.post.findMany({
     take: 20,  // Limit
     skip: (page - 1) * 20,  // Offset
     orderBy: { createdAt: 'desc' }
   })
   ```

3. **Add caching**
   ```typescript
   // Simple in-memory cache
   const cache = new Map()
   
   if (cache.has(key)) {
     return cache.get(key)
   }
   
   const data = await fetchData()
   cache.set(key, data)
   return data
   ```

4. **Select only needed fields**
   ```typescript
   // ❌ Don't fetch everything
   const user = await prisma.user.findUnique({ where: { id } })
   
   // ✅ Select specific fields
   const user = await prisma.user.findUnique({
     where: { id },
     select: { id: true, name: true, email: true }
   })
   ```

---

## Getting More Help

### 1. **Check Logs**
   - Vercel: Check Function Logs in dashboard
   - Local: Check terminal output
   - Supabase: Check Logs in dashboard

### 2. **Search Documentation**
   - [BuildFlow Docs](./API_GENERATION_GUIDE.md)
   - [Supabase Docs](https://supabase.com/docs)
   - [Next.js Docs](https://nextjs.org/docs)

### 3. **Contact Support**
   - Email: support@buildflow.ai
   - Include: Error message, steps to reproduce, screenshots

### 4. **Community**
   - Check example code in [API Test Cases](../lib/api-test-cases.ts)
   - Review working examples

---

## Quick Reference: Error Codes

| Code | Meaning | Common Cause | Solution |
|------|---------|--------------|----------|
| 400 | Bad Request | Invalid input data | Check validation, fix request body |
| 401 | Unauthorized | Not logged in | Authenticate user, check session |
| 403 | Forbidden | No permission | Check ownership, verify user role |
| 404 | Not Found | Resource doesn't exist | Verify ID, check database |
| 409 | Conflict | Duplicate unique field | Check for existing email, username |
| 413 | Payload Too Large | File/data too big | Reduce size or increase limit |
| 429 | Too Many Requests | Rate limit exceeded | Wait and retry, implement backoff |
| 500 | Server Error | Code error, DB issue | Check logs, review error handling |

---

**Last Updated**: February 2026  
**Version**: 1.0

**Need more help?** Contact support@buildflow.ai with your specific issue.
