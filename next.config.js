/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com https://cdnjs.cloudflare.com",
              "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co",
              "frame-src 'self' blob: data:",
              "worker-src 'self' blob:",
            ].join('; ')
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ]
      }
    ];
  },

  // Suppress deprecation warnings
  webpack: (config) => {
    config.infrastructureLogging = {
      level: 'error',
    };
    return config;
  }
};

export default nextConfig;