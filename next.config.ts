import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
  },

  // Allow the WebContainer dev-server iframe (*.webcontainer-api.io) to load
  // /_next/* HMR and chunk resources in development without the cross-origin warning.
  allowedDevOrigins: ['*.webcontainer-api.io'],

  async rewrites() {
    return [
      {
        // PostHog reverse proxy – routes analytics requests through this domain
        // to avoid ad blockers and improve data quality.
        source: '/ingest/static/:path*',
        destination: 'https://eu-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://eu.i.posthog.com/:path*',
      },
    ]
  },
  // Required to support PostHog trailing-slash API requests
  skipTrailingSlashRedirect: true,

  typescript: {
    ignoreBuildErrors: false,
  },


  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }, // Vercel Blob
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },        // Google avatars
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },    // GitHub avatars
      { protocol: 'https', hostname: '*.supabase.co' },                    // Supabase storage
      { protocol: 'https', hostname: 'images.unsplash.com' },              // Unsplash CDN
      { protocol: 'https', hostname: 'picsum.photos' },                    // Lorem Picsum
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      }
    }

    // Deduplicate React — ensures next-auth (serverExternalPackages), posthog,
    // and all other packages share the SAME React instance. Without this,
    // packages that carry their own React reference cause useState to see a null
    // dispatcher during cold-start SSR, triggering:
    //   TypeError: Cannot read properties of null (reading 'useState')
    config.resolve.alias = {
      ...config.resolve.alias,
      react: require.resolve('react'),
      'react-dom': require.resolve('react-dom'),
      // Replace next-auth/react with an app-bundled shim so SessionProvider
      // and useSession use the same React instance as the rest of the app,
      // avoiding the "null dispatcher" crash from the external React copy.
      'next-auth/react': require.resolve('./lib/next-auth-react-shim'),
    }

    // Exclude esbuild binary files from bundling
    config.module.rules.push({
      test: /\.exe$/,
      type: 'asset/resource',
      generator: {
        emit: false,
      },
    })

    config.module.rules.push({
      test: /node_modules\/@esbuild\/.*\/README\.md$/,
      type: 'asset/resource',
      generator: {
        emit: false,
      },
    })

    return config
  },

  serverExternalPackages: [
    '@prisma/client',
    'bcryptjs',
    'esbuild',
    'otplib',             // Turbopack can't statically analyse otplib's CJS/ESM exports
    'next-auth',          // Turbopack bundling next-auth breaks the [...nextauth] route handler
    '@auth/prisma-adapter', // depends on @prisma/client — must stay external
  ],

  headers: async () => [
    {
      // ── WebContainer isolation headers (chatbuilder only) ──────────────
      // SharedArrayBuffer (required by the WebContainer WASM runtime) is only
      // available on cross-origin isolated pages. These headers MUST be scoped
      // to /chatbuilder — applying them globally breaks OAuth popups and Stripe
      // on other pages (COOP same-origin prevents cross-window communication).
      //
      // credentialless COEP (not require-corp): more permissive — allows
      // PostHog/Sentry/Vercel scripts to load without CORP headers, and still
      // enables SharedArrayBuffer for the WebContainer WASM sandbox.
      source: '/chatbuilder/:path*',
      headers: [
        { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      ],
    },
    {
      // ── Global security headers (all routes) ───────────────────────────
      source: '/:path*',
      headers: [
        // Full Content Security Policy
        // Next.js requires 'unsafe-inline' for its hydration <script> tags.
        // We compensate by keeping the default-src strict ('self') and
        // explicitly allowlisting every external source we actually use.
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            // Scripts: self + Next.js inline hydration + Stripe.js + Google Tag Manager + Monaco Editor CDN + blob: for Next.js workers
            // wasm-unsafe-eval allows WASM without opening full eval() to JS (safer than unsafe-eval globally)
            "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://cdn.jsdelivr.net https://cdn.tailwindcss.com https://eu-assets.i.posthog.com https://vercel.live blob:",
            // Styles: self + inline (Tailwind/shadcn) + Google Fonts
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            // Fonts: self + data URIs + Google Fonts CDN
            "font-src 'self' data: https://fonts.gstatic.com",
            // Images: self + data URIs + blobs (canvas) + any HTTPS host (CDN thumbnails)
            "img-src 'self' data: blob: https:",
            // Fetch/XHR: self + Stripe + Anthropic + Upstash + Supabase + Sentry + PostHog + GTM + Vercel Analytics + WebContainer
            "connect-src 'self' https://api.stripe.com https://api.anthropic.com https://*.upstash.io https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://us.i.posthog.com https://eu.i.posthog.com https://eu-assets.i.posthog.com https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://*.stackblitz.com https://*.webcontainer.io wss://*.webcontainer.io https://*.webcontainer-api.io wss://*.webcontainer-api.io https://*.staticblitz.com wss://*.staticblitz.com https://vitals.vercel-insights.com https://vercel.live wss://vercel.live",
            // Workers: Next.js Turbopack creates blob: workers at runtime
            "worker-src 'self' blob:",
            // Frames: WebContainer dev server runs on *.webcontainer-api.io subdomains
            // blob: required for GenerationExperience inline HTML preview (blob URL iframes)
            "frame-src 'self' blob: https://vercel.live https://*.vercel.live https://stackblitz.com https://*.stackblitz.com https://*.webcontainer.io https://*.webcontainer-api.io",
            // Clickjacking: only we can embed our own pages
            "frame-ancestors 'self'",
            // Block <object> and <embed> entirely
            "object-src 'none'",
            // Ensure all resources loaded over HTTPS
            "upgrade-insecure-requests",
          ].join('; '),
        },
        // Belt + braces clickjacking (legacy browsers)
        {
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN',
        },
        // Prevent MIME-type sniffing
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        // Force HTTPS for 2 years (preload-eligible)
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        // Referrer control
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        // Restrict browser feature access
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=(), payment=(self)',
        },
        // Basic XSS filter (legacy browsers)
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
      ],
    },
    {
      // ── Chatbuilder: add unsafe-eval for Monaco editor + WebContainer WASM ─
      // This overrides the global /:path* CSP for /chatbuilder only.
      // unsafe-eval is required by Monaco's worker scripts and WebContainer WASM JIT.
      source: '/chatbuilder/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://cdn.jsdelivr.net https://cdn.tailwindcss.com https://eu-assets.i.posthog.com https://vercel.live blob:",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' data: https://fonts.gstatic.com",
            "img-src 'self' data: blob: https:",
            "connect-src 'self' https://api.stripe.com https://api.anthropic.com https://*.upstash.io https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://us.i.posthog.com https://eu.i.posthog.com https://eu-assets.i.posthog.com https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://*.stackblitz.com https://*.webcontainer.io wss://*.webcontainer.io https://*.webcontainer-api.io wss://*.webcontainer-api.io https://*.staticblitz.com wss://*.staticblitz.com https://vitals.vercel-insights.com https://vercel.live wss://vercel.live",
            "worker-src 'self' blob:",
            "frame-src 'self' blob: https://vercel.live https://*.vercel.live https://stackblitz.com https://*.stackblitz.com https://*.webcontainer.io https://*.webcontainer-api.io",
            "frame-ancestors 'self'",
            "object-src 'none'",
            "upgrade-insecure-requests",
          ].join('; '),
        },
      ],
    },
    {
      // ── Preview routes: relax CSP to allow user-generated HTML to run ──
      // sessionId is a 32-char random hex token (unguessable, 20-min TTL)
      source: '/preview/:sessionId/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://cdn.tailwindcss.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://cdn.tailwindcss.com",
            "font-src 'self' data: https://fonts.gstatic.com",
            "img-src 'self' data: blob: https:",
            "connect-src 'self' https://cdn.tailwindcss.com",
            "frame-ancestors 'self'",
          ].join('; '),
        },
      ],
    },
    {
      // ── Published sites: allow user-generated content to run ──────────
      source: '/p/:slug/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://cdn.tailwindcss.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://cdn.tailwindcss.com",
            "font-src 'self' data: https://fonts.gstatic.com",
            "img-src 'self' data: blob: https:",
            "connect-src 'self' https: https://cdn.tailwindcss.com",
            "frame-ancestors 'self'",
          ].join('; '),
        },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
      ],
    },
  ],
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },
}

const config = {
  ...nextConfig,
  turbopack: {
    // Explicitly set project root so Turbopack doesn't infer ./app as the workspace root.
    // Without this, Next.js 16.1.7+ panics with "couldn't find next/package.json from ./app".
    root: __dirname,
    // Same shim as the webpack alias above — replaces next-auth/react hooks with
    // app-bundled React implementations to prevent the null-dispatcher SSR crash.
    resolveAlias: {
      'next-auth/react': './lib/next-auth-react-shim',
    },
  },
}

export default config