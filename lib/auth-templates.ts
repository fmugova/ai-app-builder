// Authentication Templates for Generated Sites
// Supports: NextAuth, Supabase Auth, Custom JWT

export const AUTH_TEMPLATES = {
  // NextAuth Template (Most Popular)
  nextauth: {
    id: 'nextauth',
    name: 'NextAuth.js Authentication',
    description: 'Industry-standard authentication for Next.js with multiple providers',
    features: [
      'Email/Password authentication',
      'OAuth providers (Google, GitHub, etc.)',
      'JWT sessions',
      'Protected routes',
      'Password reset',
      'Email verification'
    ],
    dependencies: {
      'next-auth': '^4.24.5',
      'bcryptjs': '^2.4.3',
      '@prisma/client': '^5.7.0',
      'prisma': '^5.7.0'
    },
    files: [
      {
        path: 'lib/auth.ts',
        content: `import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.hashedPassword) {
          throw new Error('Invalid credentials')
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        )

        if (!isCorrectPassword) {
          throw new Error('Invalid credentials')
        }

        return user
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || ''
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || ''
    })
  ],
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/logout',
    error: '/auth/error'
  },
  session: {
    strategy: 'jwt'
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string
      }
      return session
    }
  }
}
`
      },
      {
        path: 'app/api/auth/[...nextauth]/route.ts',
        content: `import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
`
      },
      {
        path: 'app/api/auth/register/route.ts',
        content: `import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword
      }
    })

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
`
      }
    ],
    prismaSchema: `model User {
  id              String    @id @default(cuid())
  name            String?
  email           String?   @unique
  emailVerified   DateTime?
  image           String?
  hashedPassword  String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  accounts        Account[]
  sessions        Session[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
`,
    envVariables: `# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Database
DATABASE_URL="postgresql://..."
`
  },

  // Supabase Auth Template
  supabase: {
    id: 'supabase',
    name: 'Supabase Authentication',
    description: 'Backend-as-a-Service authentication with real-time capabilities',
    features: [
      'Email/Password authentication',
      'Magic link authentication',
      'OAuth providers',
      'Row Level Security',
      'Real-time subscriptions',
      'Built-in user management'
    ],
    dependencies: {
      '@supabase/supabase-js': '^2.39.0',
      '@supabase/auth-helpers-nextjs': '^0.8.7'
    },
    files: [
      {
        path: 'lib/supabase.ts',
        content: `import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth helpers
export const signUp = async (email: string, password: string, name: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name }
    }
  })
  return { data, error }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: \`\${window.location.origin}/auth/update-password\`
  })
  return { data, error }
}
`
      },
      {
        path: 'middleware.ts',
        content: `import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protect routes that require authentication
  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*']
}
`
      }
    ],
    sqlSetup: `-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only read their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);
`,
    envVariables: `# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
`
  },

  // Custom JWT Template (Most Flexible)
  jwt: {
    id: 'jwt',
    name: 'Custom JWT Authentication',
    description: 'Fully customizable authentication with JWT tokens',
    features: [
      'Email/Password authentication',
      'JWT token generation',
      'Refresh tokens',
      'Custom user fields',
      'Complete control',
      'No external dependencies'
    ],
    dependencies: {
      'jsonwebtoken': '^9.0.2',
      'bcryptjs': '^2.4.3',
      '@prisma/client': '^5.7.0'
    },
    files: [
      {
        path: 'lib/jwt.ts',
        content: `import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret'

export const generateAccessToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' })
}

export const generateRefreshToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' })
}

export const verifyAccessToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string }
  } catch (error) {
    return null
  }
}

export const verifyRefreshToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string }
  } catch (error) {
    return null
  }
}
`
      },
      {
        path: 'app/api/auth/login/route.ts',
        content: `import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { generateAccessToken, generateRefreshToken } from '@/lib/jwt'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user || !user.hashedPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const isValid = await bcrypt.compare(password, user.hashedPassword)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const accessToken = generateAccessToken(user.id)
    const refreshToken = generateRefreshToken(user.id)

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    })

    return NextResponse.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}
`
      }
    ],
    prismaSchema: `model User {
  id              String         @id @default(cuid())
  name            String
  email           String         @unique
  hashedPassword  String
  emailVerified   Boolean        @default(false)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  refreshTokens   RefreshToken[]
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
`,
    envVariables: `# JWT
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# Database
DATABASE_URL="postgresql://..."
`
  }
}
