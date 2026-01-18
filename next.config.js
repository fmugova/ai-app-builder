import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */

const nextConfig = {
    eslint: {
      // Only run ESLint on these directories during production builds
      dirs: ['app', 'components', 'lib', 'hooks'],
    },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // Optimize image formats
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Enable SWC minification for faster builds
  swcMinify: true,
  // Enable gzip/brotli compression
  compress: true,
  // Optimize package imports to reduce bundle size
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-label',
      '@radix-ui/react-progress',
      '@radix-ui/react-slot',
      'lucide-react',
    ],
    // Reduce server component overhead
    serverComponentsExternalPackages: ['@prisma/client', '@prisma/engines'],
  },
  // Add this to force new bundle generation
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  // Add comprehensive security headers
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    const scriptSrc = isDev ? "'self' 'unsafe-eval' 'unsafe-inline'" : "'self'";
    return [
      {
        source: '/:path*',
        headers: [
          // HTTP Strict Transport Security
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // XSS Protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          // Referrer Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // Permissions Policy
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline'; font-src 'self' data: https://fonts.gstatic.com;`
          }
        ],
      },
    ]
  },
}

export default withBundleAnalyzer(nextConfig)