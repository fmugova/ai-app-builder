import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
  },

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
  ],

  headers: async () => [
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
            "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://cdn.jsdelivr.net blob:",
            // Styles: self + inline (Tailwind/shadcn) + Google Fonts
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            // Fonts: self + data URIs + Google Fonts CDN
            "font-src 'self' data: https://fonts.gstatic.com",
            // Images: self + data URIs + blobs (canvas) + any HTTPS host (CDN thumbnails)
            "img-src 'self' data: blob: https:",
            // Fetch/XHR: self + Stripe + Anthropic + Upstash + Supabase + Sentry + PostHog + GTM
            "connect-src 'self' https://api.stripe.com https://api.anthropic.com https://*.upstash.io https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://us.i.posthog.com https://eu.i.posthog.com https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com",
            // Workers: Next.js Turbopack creates blob: workers at runtime
            "worker-src 'self' blob:",
            // Frames: self only — preview iframes are on same origin at /preview/*
            "frame-src 'self'",
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
      // ── Preview routes: relax CSP to allow user-generated HTML to run ──
      // sessionId is a 32-char random hex token (unguessable, 20-min TTL)
      source: '/preview/:sessionId/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
            "font-src 'self' data: https://fonts.gstatic.com",
            "img-src 'self' data: blob: https:",
            "connect-src 'self'",
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
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
            "font-src 'self' data: https://fonts.gstatic.com",
            "img-src 'self' data: blob: https:",
            "connect-src 'self' https:",
            "frame-ancestors 'self'",
          ].join('; '),
        },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
      ],
    },
  ],
  output: 'standalone',
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
  turbopack: {},
}

export default config