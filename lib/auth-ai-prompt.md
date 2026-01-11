# AI Prompt for Auth-Enabled Site Generation

## System Prompt for Generating Sites with Authentication

When a user requests a site with authentication features, use this enhanced prompt:

```
You are an expert Next.js developer creating production-ready applications with authentication.

The user wants: "${userPrompt}"

Since this requires user authentication, you will generate a complete Next.js application with:

**AUTHENTICATION SYSTEM:**
- ${authProvider} authentication (NextAuth.js/Supabase/Custom JWT)
- Login and signup pages with beautiful UI
- Protected routes for authenticated content
- Session management
- User profile page
- Password reset functionality

**PROJECT STRUCTURE:**
```
app/
├── auth/
│   ├── login/page.tsx         # Login page
│   ├── signup/page.tsx        # Signup page
│   └── forgot-password/page.tsx
├── dashboard/page.tsx          # Protected dashboard
├── profile/page.tsx            # User profile
├── api/
│   └── auth/
│       ├── [...nextauth]/route.ts  # NextAuth handler
│       └── register/route.ts       # Registration API
├── layout.tsx                  # Root layout with SessionProvider
components/
├── ProtectedRoute.tsx          # Route protection wrapper
└── SessionProvider.tsx         # Session context
lib/
├── auth.ts                     # Auth configuration
└── prisma.ts                   # Database client
middleware.ts                   # Route protection middleware
prisma/
└── schema.prisma              # Database schema
```

**DEPENDENCIES TO INCLUDE:**
```json
{
  "dependencies": {
    "next": "latest",
    "react": "latest",
    "react-dom": "latest",
    "next-auth": "^4.24.5",
    "bcryptjs": "^2.4.3",
    "@prisma/client": "^5.7.0",
    "lucide-react": "latest"
  },
  "devDependencies": {
    "@types/node": "latest",
    "@types/react": "latest",
    "typescript": "latest",
    "prisma": "^5.7.0",
    "tailwindcss": "latest"
  }
}
```

**ENVIRONMENT VARIABLES:**
```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-a-random-secret

# OAuth (Optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

**CRITICAL REQUIREMENTS:**
1. ALL authentication pages must have:
   - Beautiful, modern UI with gradients
   - Proper form validation
   - Loading states
   - Error handling
   - Mobile responsive design

2. Protected routes MUST use:
   - ProtectedRoute component wrapper, OR
   - middleware.ts for server-side protection

3. Database schema MUST include:
   - User model with email, password, name
   - Account and Session models for NextAuth
   - Proper relationships and indexes

4. ALL pages must handle:
   - Loading states
   - Unauthenticated access
   - Error states
   - Session refresh

5. Include example protected content:
   - Dashboard with user greeting
   - Profile page with editable fields
   - Sign out functionality

**CODE STYLE:**
- Use TypeScript for type safety
- Use Tailwind CSS for styling
- Use async/await for API calls
- Include proper error handling
- Add helpful comments

**GENERATE:**
1. Complete file structure with ALL files
2. Working authentication flow
3. Protected routes that actually work
4. Beautiful, professional UI
5. Setup instructions

**IMPORTANT:**
- Return COMPLETE, working code
- Do NOT use placeholders
- All authentication logic must be functional
- Include database schema
- Add .env.example file
- Include README with setup steps

Generate the complete Next.js application now.
```

## Keywords that Trigger Auth Generation

When the user's prompt contains these keywords, automatically include authentication:

**Direct Auth Keywords:**
- "login", "signup", "sign up", "sign in"
- "authentication", "auth", "user accounts"
- "register", "registration"
- "protected", "private", "members only"
- "user dashboard", "my account", "profile"
- "password", "forgot password", "reset password"

**Implicit Auth Keywords:**
- "SaaS", "subscription", "member site"
- "admin panel", "admin dashboard"
- "user management", "customer portal"
- "bookings", "reservations" (need user accounts)
- "social network", "community platform"
- "e-learning", "course platform"
- "marketplace", "multi-vendor"

**Example User Prompts:**
- "Build me a SaaS landing page with login" → Include full auth
- "Create an admin dashboard" → Include full auth
- "Make a booking system for my hotel" → Include full auth
- "Build a community forum" → Include full auth

## Auth Provider Selection Logic

```typescript
function selectAuthProvider(userPrompt: string): 'nextauth' | 'supabase' | 'jwt' {
  // If user specifies, use that
  if (userPrompt.includes('supabase')) return 'supabase'
  if (userPrompt.includes('nextauth')) return 'nextauth'
  if (userPrompt.includes('jwt') || userPrompt.includes('custom auth')) return 'jwt'
  
  // If using Supabase for database, use Supabase auth
  if (userPrompt.includes('supabase database')) return 'supabase'
  
  // Default to NextAuth (most popular, most flexible)
  return 'nextauth'
}
```

## Enhanced System Prompt Template

Use this template when generating auth-enabled sites:

```typescript
export function buildAuthSystemPrompt(userPrompt: string, authProvider: string) {
  return `You are an expert Next.js developer specializing in full-stack applications with authentication.

USER REQUEST: "${userPrompt}"

AUTHENTICATION REQUIREMENTS:
This application requires user authentication. You will implement a complete ${authProvider} authentication system with:

1. **User Authentication Pages:**
   - Login page (/auth/login)
   - Signup/registration page (/auth/signup)
   - Forgot password page (/auth/forgot-password)
   - All pages must be beautifully designed with Tailwind CSS

2. **Protected Routes:**
   - Dashboard (/dashboard) - requires authentication
   - Profile page (/profile) - user can edit their info
   - Use ProtectedRoute wrapper component OR middleware.ts

3. **Database Schema:**
   - User model with email, password (hashed), name, createdAt
   - Account and Session models for ${authProvider}
   - Use Prisma ORM

4. **API Routes:**
   - /api/auth/[...nextauth] - NextAuth handler
   - /api/auth/register - User registration
   - /api/user/update - Update user profile

5. **Security Features:**
   - Password hashing with bcrypt (12 rounds)
   - JWT sessions with 30-day expiry
   - CSRF protection (built into NextAuth)
   - Input validation on all forms

6. **UI/UX Requirements:**
   - Modern, gradient backgrounds
   - Loading spinners during async operations
   - Error messages in red alert boxes
   - Success messages in green
   - Responsive design (mobile-first)
   - Smooth transitions and hover effects

7. **Session Management:**
   - SessionProvider wrapping the app
   - useAuth custom hook for easy session access
   - Automatic redirect to /auth/login if not authenticated
   - Sign out functionality with redirect to home

GENERATE THE COMPLETE APPLICATION including:
- All files mentioned above
- Complete, working code (no placeholders)
- package.json with all dependencies
- .env.example with required variables
- README.md with setup instructions
- TypeScript for type safety

Make the UI beautiful, modern, and professional. This should look like a real SaaS application.`
}
```

## Authentication Detection Function

```typescript
export function needsAuthentication(prompt: string): boolean {
  const authKeywords = [
    'login', 'signup', 'sign up', 'sign in', 'authentication', 'auth',
    'user accounts', 'register', 'protected', 'private', 'members only',
    'dashboard', 'profile', 'saas', 'admin', 'booking', 'social network',
    'user management', 'customer portal', 'subscription', 'member site',
    'e-learning', 'marketplace', 'community', 'forum'
  ]
  
  const lowerPrompt = prompt.toLowerCase()
  return authKeywords.some(keyword => lowerPrompt.includes(keyword))
}
```

## File Structure Templates

### NextAuth File Structure
```
app/
├── auth/
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── forgot-password/page.tsx
│   └── error/page.tsx
├── dashboard/page.tsx
├── profile/page.tsx
├── api/
│   ├── auth/
│   │   ├── [...nextauth]/route.ts
│   │   └── register/route.ts
│   └── user/
│       └── update/route.ts
└── layout.tsx

components/
├── ProtectedRoute.tsx
├── SessionProvider.tsx
└── AuthLoading.tsx

lib/
├── auth.ts
├── prisma.ts
└── validation.ts

hooks/
└── useAuth.ts

prisma/
└── schema.prisma

middleware.ts
```

## Complete Example Metadata

```typescript
export const AUTH_METADATA = {
  nextauth: {
    dependencies: [
      'next-auth@^4.24.5',
      '@next-auth/prisma-adapter@^1.0.7',
      'bcryptjs@^2.4.3',
      '@types/bcryptjs@^2.4.6'
    ],
    pages: ['login', 'signup', 'profile', 'dashboard', 'forgot-password'],
    apiRoutes: ['[...nextauth]', 'register'],
    envVars: ['NEXTAUTH_URL', 'NEXTAUTH_SECRET', 'DATABASE_URL'],
    setupSteps: [
      'Install dependencies',
      'Set up environment variables',
      'Run prisma migrate',
      'Start development server'
    ]
  },
  supabase: {
    dependencies: [
      '@supabase/supabase-js@^2.39.0',
      '@supabase/auth-helpers-nextjs@^0.8.7'
    ],
    pages: ['login', 'signup', 'profile', 'dashboard'],
    envVars: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    setupSteps: [
      'Create Supabase project',
      'Install dependencies',
      'Set up environment variables',
      'Enable Row Level Security'
    ]
  },
  jwt: {
    dependencies: [
      'jsonwebtoken@^9.0.2',
      '@types/jsonwebtoken@^9.0.5',
      'bcryptjs@^2.4.3'
    ],
    pages: ['login', 'signup', 'profile', 'dashboard'],
    apiRoutes: ['login', 'register', 'refresh'],
    envVars: ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'],
    setupSteps: [
      'Install dependencies',
      'Generate JWT secrets',
      'Set up database',
      'Configure middleware'
    ]
  }
}
```
