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
      {
        key: 'Content-Security-Policy',
        value: "frame-ancestors 'self'"
      }
    ]
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

module.exports = {
  ...nextConfig,
  turbopack: {},
}