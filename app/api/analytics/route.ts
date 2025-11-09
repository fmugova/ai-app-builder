import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '30d';

    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get projects
    const projects = await prisma.project.findMany({
      where: {
        userId: session.user.id,
        createdAt: { gte: startDate }
      }
    });

    // Try to get analytics events (may not exist yet)
    let analytics: any[] = [];
    try {
      analytics = await prisma.analyticsEvent.findMany({
        where: {
          userId: session.user.id,
          createdAt: { gte: startDate }
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      // Table might not exist yet, use empty array
      console.log('AnalyticsEvent table not available, using mock data');
    }

    // Calculate stats
    const totalProjects = projects.length;
    const totalGenerations = analytics.filter((e: any) => e.event === 'generation').length;
    
    // Group projects by type
    const projectsByType = projects.reduce((acc: Record<string, number>, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1;
      return acc;
    }, {});

    // Daily activity
    const dailyActivity = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      const dateStr = date.toISOString().split('T')[0];
      
      const count = analytics.filter((e: any) => 
        e.createdAt.toISOString().split('T')[0] === dateStr
      ).length;
      
      return { date: dateStr, count };
    });

    // Get most used project type
    const mostUsedType = Object.entries(projectsByType)
      .sort(([, a], [, b]) => (b as number) - (a as number))[0];

    return NextResponse.json({
      totalProjects,
      totalGenerations: totalGenerations || totalProjects, // Fallback to project count
      avgGenerationsPerDay: ((totalGenerations || totalProjects) / days).toFixed(1),
      mostUsedProjectType: mostUsedType?.[0] || 'N/A',
      dailyActivity,
      projectsByType: Object.entries(projectsByType).map(([type, count]) => ({
        type,
        count
      })),
      recentActivity: analytics.slice(0, 10).map((e: any) => ({
        id: e.id,
        action: e.event,
        timestamp: e.createdAt.toISOString(),
        details: e.properties?.projectName || 'N/A'
      }))
    });

  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}