import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

// Force dynamic generation - sitemap should always be fresh
export const dynamic = 'force-dynamic'
export const revalidate = 3600 // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.buildflow-ai.app'
  const currentDate = new Date().toISOString()

  // Static pages - core site structure
  const staticPages: MetadataRoute.Sitemap = [
    // Homepage - Highest priority
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1,
    },
    // Pricing page - High priority (conversion page)
    {
      url: `${baseUrl}/pricing`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    // Templates page - High priority (showcases capabilities)
    {
      url: `${baseUrl}/templates`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    // Builder page - Main product
    {
      url: `${baseUrl}/builder`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    // Authentication pages
    {
      url: `${baseUrl}/auth/signin`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/auth/signup`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // Legal pages
    {
      url: `${baseUrl}/privacy`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  // Dynamic pages - fetch from database
  let dynamicPages: MetadataRoute.Sitemap = []

  try {
    // Fetch public/shared projects for preview pages
    const publicProjects = await prisma.project.findMany({
      where: {
        isPublic: true,
      },
      select: {
        id: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 100, // Limit to most recent 100 public projects
    })

    // Add public project preview pages
    const projectPages: MetadataRoute.Sitemap = publicProjects.map((project) => ({
      url: `${baseUrl}/preview/${project.id}`,
      lastModified: project.updatedAt.toISOString(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))

    dynamicPages = [...projectPages]
  } catch (error) {
    // If database fetch fails, just return static pages
    console.error('Failed to fetch dynamic sitemap data:', error)
  }

  return [...staticPages, ...dynamicPages]
}
