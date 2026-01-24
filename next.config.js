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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http:",
              "script-src-elem 'self' 'unsafe-inline' https: http:",
              "style-src 'self' 'unsafe-inline' https:",
              "img-src 'self' data: https: http:",
              "font-src 'self' data: https:",
              "connect-src 'self' https: http:",
              "frame-src 'self' https: http:"
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