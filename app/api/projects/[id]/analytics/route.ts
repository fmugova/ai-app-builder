import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Helper function to get date ranges
function getDateRange(period: '7d' | '30d' | '90d') {
  const now = new Date()
  const ranges = {
    '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
  }
  return ranges[period]
}

// Helper to extract device type from user agent
function getDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase()
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'Tablet'
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'Mobile'
  }
  return 'Desktop'
}

// Helper to extract browser from user agent
function getBrowser(userAgent: string): string {
  const ua = userAgent
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome'
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
  if (ua.includes('Edg')) return 'Edge'
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera'
  return 'Other'
}

// Helper to parse location from properties
type AnalyticsEventProperties = {
  country?: string;
  city?: string;
  [key: string]: unknown;
};

function parseLocation(properties: AnalyticsEventProperties): { country: string; city: string } {
  // In production, you would use IP geolocation service
  // For now, return defaults or parse from headers
  return {
    country: properties?.country || 'Unknown',
    city: properties?.city || 'Unknown'
  }
}

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const projectId = context.params.id

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ...(user.role !== 'admin' && { userId: user.id })
      },
      select: {
        id: true,
        name: true,
        views: true
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 })
    }

    // Get period from query params
    const { searchParams } = new URL(request.url)
    const period = (searchParams.get('period') || '30d') as '7d' | '30d' | '90d'
    const startDate = getDateRange(period)

    // Fetch analytics events for this project
    const events = await prisma.analyticsEvent.findMany({
      where: {
        createdAt: {
          gte: startDate
        },
        properties: {
          path: ['projectId'],
          equals: projectId
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Process page views
    const pageViews = events.filter(e => e.event === 'page_view')
    const totalPageViews = pageViews.length

    // Calculate unique visitors (using session-like logic from user agent + date)
    const uniqueVisitorSet = new Set(
      pageViews.map(e => {
        const props = e.properties as AnalyticsEventProperties
        const ua = typeof props.userAgent === 'string' ? props.userAgent : 'unknown'
        const date = new Date(e.createdAt).toDateString()
        return `${ua}-${date}`
      })
    )
    const uniqueVisitors = uniqueVisitorSet.size

    // Calculate average time on page
    const pageTimes = pageViews
      .map(e => {
        const props = e.properties as AnalyticsEventProperties
        return typeof props.timeOnPage === 'number' ? props.timeOnPage : 0
      })
      .filter(t => t > 0)
    const avgTimeOnPage = pageTimes.length > 0
      ? Math.round(pageTimes.reduce((a, b) => a + b, 0) / pageTimes.length)
      : 0

    // Calculate bounce rate (simplified: single page view sessions)
    const sessionCounts = new Map()
    pageViews.forEach(e => {
      const props = e.properties as AnalyticsEventProperties
      const ua = typeof props.userAgent === 'string' ? props.userAgent : 'unknown'
      const date = new Date(e.createdAt).toDateString()
      const sessionId = `${ua}-${date}`
      sessionCounts.set(sessionId, (sessionCounts.get(sessionId) || 0) + 1)
    })
    const singlePageSessions = Array.from(sessionCounts.values()).filter(count => count === 1).length
    const bounceRate = sessionCounts.size > 0 ? (singlePageSessions / sessionCounts.size) * 100 : 0

    // Calculate conversions
    const formSubmissions = events.filter(e => e.event === 'form_submit').length
    const buttonClicks = events.filter(e => e.event === 'button_click').length
    const linkClicks = events.filter(e => e.event === 'link_click').length
    const totalConversions = formSubmissions + buttonClicks + linkClicks

    const conversionRate = totalPageViews > 0 ? (totalConversions / totalPageViews) * 100 : 0

    // Page views over time
    const viewsByDate = new Map<string, { views: number; visitors: Set<string> }>()
    pageViews.forEach(e => {
      const date = new Date(e.createdAt).toISOString().split('T')[0]
      if (!viewsByDate.has(date)) {
        viewsByDate.set(date, { views: 0, visitors: new Set() })
      }
      const data = viewsByDate.get(date)!
      data.views++
      const props = e.properties as AnalyticsEventProperties
      data.visitors.add(typeof props.userAgent === 'string' ? props.userAgent : 'unknown')
    })

    const pageViewsOverTime = Array.from(viewsByDate.entries())
      .map(([date, data]) => ({
        date,
        views: data.views,
        visitors: data.visitors.size
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Top traffic sources
    const referrerCounts = new Map<string, number>()
    pageViews.forEach(e => {
      const props = e.properties as AnalyticsEventProperties
      const referrer = typeof props.referrer === 'string' ? props.referrer : 'Direct'
      const url = referrer === 'Direct' ? 'Direct' : new URL(referrer).hostname
      referrerCounts.set(url, (referrerCounts.get(url) || 0) + 1)
    })

    const topTrafficSources = Array.from(referrerCounts.entries())
      .map(([referrer, visits]) => {
        const source = referrer === 'Direct' ? 'Direct' : 
                      referrer.includes('google') ? 'Google' :
                      referrer.includes('facebook') ? 'Facebook' :
                      referrer.includes('twitter') ? 'Twitter' :
                      referrer.includes('linkedin') ? 'LinkedIn' :
                      'Other'
        return {
          source,
          referrer,
          visits,
          percentage: (visits / totalPageViews) * 100
        }
      })
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 10)

    // Device breakdown
    const deviceCounts = new Map<string, number>()
    pageViews.forEach(e => {
      const props = e.properties as AnalyticsEventProperties
      const ua = typeof props.userAgent === 'string' ? props.userAgent : 'unknown'
      const device = getDeviceType(ua)
      deviceCounts.set(device, (deviceCounts.get(device) || 0) + 1)
    })

    const deviceBreakdown = Array.from(deviceCounts.entries())
      .map(([device, count]) => ({
        device,
        count,
        percentage: (count / totalPageViews) * 100
      }))
      .sort((a, b) => b.count - a.count)

    // Browser breakdown
    const browserCounts = new Map<string, number>()
    pageViews.forEach(e => {
      const props = e.properties as AnalyticsEventProperties
      const ua = typeof props.userAgent === 'string' ? props.userAgent : 'unknown'
      const browser = getBrowser(ua)
      browserCounts.set(browser, (browserCounts.get(browser) || 0) + 1)
    })

    const browserBreakdown = Array.from(browserCounts.entries())
      .map(([browser, count]) => ({
        browser,
        count,
        percentage: (count / totalPageViews) * 100
      }))
      .sort((a, b) => b.count - a.count)

    // Geographic distribution (simplified)
    const locationCounts = new Map<string, number>()
    pageViews.forEach(e => {
      const location = parseLocation((e.properties ?? {}) as AnalyticsEventProperties)
      const key = `${location.country}-${location.city}`
      locationCounts.set(key, (locationCounts.get(key) || 0) + 1)
    })

    const geographicDistribution = Array.from(locationCounts.entries())
      .map(([key, count]) => {
        const [country, city] = key.split('-')
        return {
          country,
          city,
          count,
          percentage: (count / totalPageViews) * 100
        }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Top pages
    const pageCounts = new Map<string, { views: number; times: number[] }>()
    pageViews.forEach(e => {
      const props = e.properties as AnalyticsEventProperties
      const path = typeof props.path === 'string' ? props.path : '/'
      if (!pageCounts.has(path)) {
        pageCounts.set(path, { views: 0, times: [] })
      }
      const data = pageCounts.get(path)!
      data.views++
      const time = typeof props.timeOnPage === 'number' ? props.timeOnPage : 0
      if (time > 0) data.times.push(time)
    })

    const topPages = Array.from(pageCounts.entries())
      .map(([page, data]) => ({
        page,
        views: data.views,
        avgTime: data.times.length > 0
          ? Math.round(data.times.reduce((a, b) => a + b, 0) / data.times.length)
          : 0
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)

    // Prepare response
    const analytics = {
      project: {
        id: project.id,
        name: project.name,
        views: project.views
      },
      summary: {
        totalPageViews,
        uniqueVisitors,
        avgTimeOnPage,
        bounceRate,
        conversionRate
      },
      pageViewsOverTime,
      topTrafficSources,
      deviceBreakdown,
      browserBreakdown,
      geographicDistribution,
      conversions: {
        formSubmissions,
        buttonClicks,
        linkClicks,
        totalConversions
      },
      topPages
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Error fetching project analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
