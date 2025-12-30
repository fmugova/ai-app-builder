import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'dashboard' // 'dashboard' or 'site-stats'
    const projectId = searchParams.get('projectId')
    const days = parseInt(searchParams.get('days') || '30')
    
    // DASHBOARD STATS (for homepage)
    if (type === 'dashboard') {
      const projectCount = await prisma.project.count({
        where: { userId: user.id }
      })

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      
      const generationCount = await prisma.generation.count({
        where: {
          userId: user.id,
          createdAt: { gte: thirtyDaysAgo }
        }
      })

      const recentProjects = await prisma.project.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          createdAt: true
        }
      })

      return NextResponse.json({
        totalProjects: projectCount,
        generationsUsed: generationCount,
        recentProjects: recentProjects.map(p => ({
          ...p,
          createdAt: p.createdAt.toISOString()
        }))
      })
    }
    
    // SITE TRAFFIC ANALYTICS (for analytics page)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const whereClause: any = {
      userId: user.id,
      createdAt: { gte: startDate }
    }
    
    if (projectId) {
      whereClause.properties = {
        path: ['projectId'],
        equals: projectId
      }
    }
    
    // Get total events
    const totalEvents = await prisma.analyticsEvent.count({
      where: whereClause
    })
    
    // Get page views
    const pageViews = await prisma.analyticsEvent.count({
      where: {
        ...whereClause,
        event: 'page_view'
      }
    })
    
    // Get form submissions
    const formSubmissions = await prisma.analyticsEvent.count({
      where: {
        ...whereClause,
        event: 'form_submit'
      }
    })
    
    // Get events by day
    const eventsByDay = await prisma.$queryRaw<Array<{date: Date, count: bigint}>>`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*) as count
      FROM "AnalyticsEvent"
      WHERE "userId" = ${user.id}
        AND "createdAt" >= ${startDate}
        ${projectId ? prisma.$queryRawUnsafe(`AND properties->>'projectId' = '${projectId}'`) : prisma.$queryRawUnsafe('')}
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
      LIMIT 30
    `
    
    // Get top events
    const topEvents = await prisma.analyticsEvent.groupBy({
      by: ['event'],
      where: whereClause,
      _count: true,
      orderBy: {
        _count: {
          event: 'desc'
        }
      },
      take: 10
    })
    
    // Get traffic sources
    const events = await prisma.analyticsEvent.findMany({
      where: {
        ...whereClause,
        event: 'page_view'
      },
      select: {
        properties: true
      },
      take: 1000
    })
    
    const referrerCounts: Record<string, number> = {}
    events.forEach(event => {
      const referrer = (event.properties as any)?.referrer || 'Direct'
      const domain = referrer === 'Direct' ? 'Direct' : new URL(referrer).hostname
      referrerCounts[domain] = (referrerCounts[domain] || 0) + 1
    })
    
    const topReferrers = Object.entries(referrerCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    
    return NextResponse.json({
      summary: {
        totalEvents,
        pageViews,
        formSubmissions,
        conversionRate: pageViews > 0 ? ((formSubmissions / pageViews) * 100).toFixed(2) : '0'
      },
      eventsByDay: eventsByDay.map(row => ({
        date: row.date,
        count: Number(row.count)
      })),
      topEvents: topEvents.map(e => ({
        event: e.event,
        count: e._count
      })),
      topReferrers
    })
    
  } catch (error: any) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}