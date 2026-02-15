import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
  },

  typescript: {
    ignoreBuildErrors: false,
  },


  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
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

  headers: async () => [{
    source: '/:path*',
    headers: [
      // Prevent clickjacking (belt + braces with X-Frame-Options)
      {
        key: 'Content-Security-Policy',
        value: "frame-ancestors 'self'",
      },
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
      // Control referrer info on cross-origin navigation
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      // Restrict browser feature access
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=(self)',
      },
      // Basic XSS filter for legacy browsers
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
    ],
  }],
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