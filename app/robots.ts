import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://www.buildflow-ai.app'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',           // Don't crawl API routes
          '/dashboard/',     // Don't crawl user dashboard (requires auth)
          '/admin/',         // Don't crawl admin pages
          '/checkout/',      // Don't crawl checkout pages
          '/settings/',      // Don't crawl settings pages
          '/_next/',         // Don't crawl Next.js internals
          '/private/',       // Don't crawl private pages
        ],
      },
      {
        userAgent: 'GPTBot',  // OpenAI's crawler
        disallow: '/',        // Block AI training crawlers
      },
      {
        userAgent: 'ChatGPT-User',
        disallow: '/',
      },
      {
        userAgent: 'CCBot',   // Common Crawl bot
        disallow: '/',
      },
      {
        userAgent: 'anthropic-ai',
        disallow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
