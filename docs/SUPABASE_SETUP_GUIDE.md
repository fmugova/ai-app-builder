# 🚀 Supabase Integration Setup Guide

## Overview

This guide will walk you through setting up Supabase integration with BuildFlow AI step-by-step. Supabase provides authentication, database, and storage services for your generated applications.

---

## Prerequisites

Before you begin, you'll need:

1. A Supabase account (free tier available at [supabase.com](https://supabase.com))
2. An active BuildFlow AI account
3. Your Supabase project created

---

## Step-by-Step Setup

### Step 1: Create a Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Choose your organization (or create one)
4. Fill in the project details:
   - **Name**: Choose a descriptive name (e.g., "my-app-production")
   - **Database Password**: Generate a strong password and **save it securely**
   - **Region**: Choose the region closest to your users
5. Click **"Create new project"**
6. Wait 1-2 minutes for your project to be provisioned

### Step 2: Locate Your Supabase Credentials

Once your project is ready:

1. In your Supabase Dashboard, click on your project
2. Navigate to **Settings** (⚙️ icon in left sidebar)
3. Click on **"API"** in the settings menu
4. You'll see these important credentials:

   ```
   Project URL:        https://[your-project].supabase.co
   anon / public key:  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   service_role key:   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

**Important Security Notes:**
- ✅ **anon key**: Safe to use in client-side code (browser, mobile apps)
- ⚠️ **service_role key**: NEVER expose in client code - only for server-side operations

---

### Step 3: Add Connection in BuildFlow AI

1. Log in to BuildFlow AI
2. Navigate to **Dashboard → Database Connections**
3. Click **"Add New Database Connection"** or **"Connect Supabase"**
4. Fill in the connection form:

   - **Connection Name**: Give it a friendly name (e.g., "Production DB")
   - **Supabase Project URL**: Paste your Project URL from Step 2
   - **Anon / Public Key**: Paste your anon key from Step 2
   - **Service Role Key** _(optional)_: Paste if you need admin operations

5. Click **"Test Connection"** button
   - ✅ If successful, you'll see a green success message
   - ❌ If it fails, double-check your credentials and try again

6. Once test passes, click **"Save Connection"**

---

### Step 4: Create Your First Table

After connecting, you can create database tables:

1. Select your Supabase connection
2. Click **"Create Table"**
3. Define your table schema:
   - Table name (lowercase, use underscores)
   - Add columns with types (TEXT, INTEGER, UUID, etc.)
   - Set primary keys, nullable fields, defaults
   - Enable Row Level Security (RLS) for security
   - Add timestamps (created_at, updated_at)

4. Click **"Generate SQL"** to preview the SQL
5. Click **"Create Table"** to execute

**Example: Users Table**
```sql
CREATE TABLE "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  "avatar_url" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own data"
  ON "users" FOR SELECT
  USING (auth.uid() = id);
```

---

### Step 5: Use in Generated Apps

When generating apps with BuildFlow AI:

1. In your prompt, mention Supabase:
   ```
   Create a blog app with Supabase database for posts and users.
   
   Features:
   - User authentication with Supabase Auth
   - Posts stored in Supabase (title, content, author)
   - Comments with real-time updates
   - Image upload to Supabase Storage
   
   Database schema:
   - users: id, name, email, avatar_url
   - posts: id, title, content, author_id, created_at
   - comments: id, post_id, user_id, content, created_at
   ```

2. BuildFlow AI will automatically:
   - Include Supabase client setup code
   - Generate CRUD operations for your tables
   - Set up authentication flows
   - Configure Row Level Security policies
   - Handle real-time subscriptions

---

## Database Best Practices

### 1. **Always Enable Row Level Security (RLS)**
   ```sql
   ALTER TABLE "your_table" ENABLE ROW LEVEL SECURITY;
   ```

### 2. **Create Policies for Data Access**
   ```sql
   -- Allow users to read only their own data
   CREATE POLICY "user_select_own"
     ON "user_data" FOR SELECT
     USING (auth.uid() = user_id);
   
   -- Allow users to insert their own data
   CREATE POLICY "user_insert_own"
     ON "user_data" FOR INSERT
     WITH CHECK (auth.uid() = user_id);
   ```

### 3. **Use UUIDs for Primary Keys**
   ```sql
   "id" UUID PRIMARY KEY DEFAULT gen_random_uuid()
   ```

### 4. **Add Timestamps to Track Changes**
   ```sql
   "created_at" TIMESTAMPTZ DEFAULT NOW(),
   "updated_at" TIMESTAMPTZ DEFAULT NOW()
   ```

### 5. **Index Foreign Keys for Performance**
   ```sql
   CREATE INDEX "posts_author_id_idx" ON "posts"("author_id");
   ```

---

## Common Supabase Features in Generated Apps

### 1. **Authentication**
```typescript
// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password'
})

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password'
})

// Get current user
const { data: { user } } = await supabase.auth.getUser()
```

### 2. **Database Queries**
```typescript
// Insert
const { data, error } = await supabase
  .from('posts')
  .insert({ title: 'Hello', content: 'World' })

// Select
const { data, error } = await supabase
  .from('posts')
  .select('*')
  .order('created_at', { ascending: false })

// Update
const { data, error } = await supabase
  .from('posts')
  .update({ title: 'Updated' })
  .eq('id', postId)

// Delete
const { data, error } = await supabase
  .from('posts')
  .delete()
  .eq('id', postId)
```

### 3. **Real-time Subscriptions**
```typescript
const subscription = supabase
  .channel('posts')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'posts' },
    (payload) => {
      console.log('Change received!', payload)
    }
  )
  .subscribe()
```

### 4. **File Storage**
```typescript
// Upload file
const { data, error } = await supabase.storage
  .from('avatars')
  .upload('user-id/avatar.png', file)

// Get public URL
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl('user-id/avatar.png')
```

---

## Verification Checklist

Before deploying your app, verify:

- ✅ Supabase connection tested successfully in BuildFlow
- ✅ All required tables created with proper schemas
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Authentication policies configured correctly
- ✅ Database indexes added for foreign keys
- ✅ Environment variables set in deployment (Vercel/Netlify)
- ✅ Service key stored securely (never in frontend code)

---

## Next Steps

1. **Explore the Database Dashboard** - View your tables, data, and schema
2. **Set Up Storage Buckets** - For file uploads (images, documents)
3. **Configure Auth Providers** - Add Google, GitHub OAuth
4. **Monitor Usage** - Check your Supabase dashboard for API calls and storage
5. **Deploy Your App** - Use BuildFlow's deploy feature to go live

---

## Need Help?

- 📚 [Supabase Documentation](https://supabase.com/docs)
- 💬 [BuildFlow AI Support](mailto:support@buildflow.ai)
- 🎥 [Video Tutorial](#) _(coming soon)_
- ❓ [Troubleshooting Guide](./SUPABASE_TROUBLESHOOTING.md)

---

**Last Updated**: February 2026  
**Version**: 1.0
