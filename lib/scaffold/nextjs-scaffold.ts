// lib/scaffold/nextjs-scaffold.ts
// Pre-built scaffold files included in every generated Next.js app.
// Claude only generates feature-specific code on top of these.

export const NEXTJS_SCAFFOLD_FILES: Record<string, string> = {
  'package.json': JSON.stringify({
    name: 'generated-app',
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint',
    },
    dependencies: {
      // Pinned to 15.0.x — the 15.3+ releases introduced a workUnitAsyncStorage
      // invariant that crashes any page calling cookies()/headers() in StackBlitz
      // when the page doesn't explicitly export dynamic = 'force-dynamic'.
      // 15.0.x is fully stable App-Router and avoids that issue entirely.
      next: '15.0.4',
      react: '^18.3.0',
      'react-dom': '^18.3.0',
      '@supabase/supabase-js': '^2.43.0',
      '@supabase/ssr': '^0.5.0',
      'lucide-react': '^0.400.0',
      'clsx': '^2.1.1',
      'tailwind-merge': '^2.3.0',
      'sonner': '^1.5.0',
    },
    devDependencies: {
      typescript: '^5',
      '@types/node': '^20',
      '@types/react': '^18',
      '@types/react-dom': '^18',
      autoprefixer: '^10.4.19',
      postcss: '^8',
      tailwindcss: '^3.4.4',
      eslint: '^9',
      'eslint-config-next': '15.0.4',
    },
  }, null, 2),

  'next.config.js': `/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow common external image hosts used in generated apps
    domains: ['images.unsplash.com', 'picsum.photos', 'avatars.githubusercontent.com', 'api.dicebear.com'],
    // Use unoptimized images in StackBlitz (no image optimisation server available)
    unoptimized: true,
  },
};

module.exports = nextConfig;
`,

  'tsconfig.json': JSON.stringify({
    compilerOptions: {
      lib: ['dom', 'dom.iterable', 'esnext'],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: 'esnext',
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'preserve',
      incremental: true,
      plugins: [{ name: 'next' }],
      paths: { '@/*': ['./*'] },
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
    exclude: ['node_modules'],
  }, null, 2),

  'tailwind.config.ts': `import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
export default config
`,

  'postcss.config.js': `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`,

  '.env.example': `# Supabase (required for auth and database)
# Get these from: https://supabase.com/dashboard/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
`,

  // StackBlitz reads .env — add it so the user can fill it in directly in the editor
  '.env': `# Add your Supabase credentials below to enable auth and database
# Get these from: https://supabase.com/dashboard/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
`,

  'app/globals.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}
`,

  'lib/supabase/client.ts': `import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key'
  return createBrowserClient(url, key)
}
`,

  'lib/supabase/server.ts': `import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

// Next.js 15: cookies() is async — must be awaited inside a request context.
// The try/catch guard prevents the "workUnitAsyncStorage" invariant crash that
// Next.js 15.5+ throws when cookies() is called during static rendering.
export async function createClient() {
  let cookieStore: ReadonlyRequestCookies | null = null
  try {
    cookieStore = await cookies()
  } catch {
    // Called outside a request context (static/build-time rendering).
    // Return a cookie-less client so the page can still load without crashing.
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key'

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore?.getAll() ?? []
      },
      setAll(cookiesToSet) {
        if (!cookieStore) return
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore!.set(name, value, options)
          )
        } catch {
          // Can be ignored in Server Components (middleware handles cookie writes)
        }
      },
    },
  })
}
`,

  'middleware.ts': `import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Skip auth middleware if Supabase isn't configured yet (e.g. StackBlitz preview)
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users away from protected routes
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/account') ||
    request.nextUrl.pathname.startsWith('/settings')

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
`,

  'app/login/page.tsx': `'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sign in</h1>
          <p className="mt-2 text-gray-600">Welcome back</p>
        </div>
        <form onSubmit={handleLogin} className="bg-white shadow-md rounded-xl p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          <p className="text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-indigo-600 hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
`,

  'app/signup/page.tsx': `'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: \`\${location.origin}/auth/callback\` },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8 text-center">
          <div className="text-5xl mb-4">✉️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-600">We sent a confirmation link to <strong>{email}</strong></p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create account</h1>
          <p className="mt-2 text-gray-600">Get started for free</p>
        </div>
        <form onSubmit={handleSignup} className="bg-white shadow-md rounded-xl p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="Min. 6 characters"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
`,

  'app/auth/callback/route.ts': `import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Force dynamic so cookies() has an active request context (Next.js 15.5+)
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key',
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(\`\${origin}\${next}\`)
    }
  }

  return NextResponse.redirect(\`\${origin}/login?error=Could+not+authenticate\`)
}
`,

  // Root layout — included in scaffold so Claude never generates an incompatible one.
  // Uses sonner for toasts (available via @/components/ui/toaster).
  'app/layout.tsx': `import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

// Force all pages to render dynamically so cookies() / Supabase auth always
// has a request context. Without this, Next.js 15.5+ throws:
// "Invariant: Expected workUnitAsyncStorage to have a store"
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Generated App',
  description: 'Built with BuildFlow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
`,

  // Thin wrapper around sonner so code can import from @/components/ui/toaster
  // (the standard shadcn path) without needing the full shadcn setup.
  'components/ui/toaster.tsx': `'use client'
export { Toaster } from 'sonner'
export { toast } from 'sonner'
`,

  // cn() utility — pre-provided so Claude doesn't need to generate it and
  // tailwind-merge is guaranteed to be installed (it's in package.json).
  'lib/utils.ts': `import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
`,

  // Safe fallback root page — Claude's generated app/page.tsx always overwrites this.
  // It exists so that if generation is incomplete the app still boots without a 500.
  'app/page.tsx': `// THIS FILE IS A SCAFFOLD FALLBACK.
// Claude's generated app/page.tsx (the real landing page) replaces this entirely.
// It exists so the app boots without a 500 when generation is still in progress.
import Link from 'next/link'

// Required: prevents Next.js 15.3+ workUnitAsyncStorage invariant on static render
export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">App Generated</h1>
      <p className="text-gray-600 mb-8 max-w-md">
        Your application was generated successfully. Add your Supabase credentials to the{' '}
        <code className="bg-gray-100 px-1 rounded">.env</code> file to enable authentication.
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
        >
          Sign In
        </Link>
        <Link
          href="/signup"
          className="border border-indigo-600 text-indigo-600 px-6 py-3 rounded-lg font-medium hover:bg-indigo-50 transition"
        >
          Sign Up
        </Link>
      </div>
    </main>
  )
}
`,

  'README.md': `# Generated App

A Next.js application with Supabase auth and database.

## Setup

1. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Set up Supabase**
   - Create a project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key

3. **Configure environment**
   \`\`\`bash
   cp .env.example .env.local
   # Fill in your Supabase credentials
   \`\`\`

4. **Run database migrations**
   - Go to your Supabase dashboard → SQL editor
   - Run the SQL from \`supabase/migrations/001_initial.sql\`

5. **Start development server**
   \`\`\`bash
   npm run dev
   \`\`\`

Open [http://localhost:3000](http://localhost:3000) to see the app.
`,
};

/** Returns scaffold files plus any caller-supplied overrides. */
export function getScaffoldFiles(
  overrides: Record<string, string> = {}
): Record<string, string> {
  return { ...NEXTJS_SCAFFOLD_FILES, ...overrides };
}
