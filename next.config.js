const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */

const nextConfig = {
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
}

module.exports = withBundleAnalyzer(nextConfig)