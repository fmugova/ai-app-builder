import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    
    // If no session, return empty projects
    if (!session?.user?.email) {
      return NextResponse.json({ projects: [] });
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ projects: [] });
    }

    // Get ONLY this user's projects
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        code: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        isPublic: true,
        shareToken: true,
        userId: true,
      },
    });

    const formattedProjects = projects.map(project => ({
      id: project.id,
      name: project.name || 'Untitled Project',
      description: project.description || '',
      type: project.type || 'webapp',
      code: project.code,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      isPublic: project.isPublic || false,
      shareToken: project.shareToken || null,
    }));

    return NextResponse.json({ projects: formattedProjects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects", projects: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, type, code } = body

    // Enforce project creation limits
    const limitsRes = await fetch(`${process.env.NEXTAUTH_URL}/api/user/check-limits`)
    const limits = await limitsRes.json()

    if (!limits.canCreateProject) {
      return NextResponse.json(
        { 
          error: 'Project limit reached!',
          message: `You've created ${limits.projectsThisMonth}/${limits.projectsLimit} projects this month. Upgrade to continue.`,
          upgrade: true
        },
        { status: 429 }
      )
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || '',
        type: type || 'webapp',
        code,
        user: { connect: { email: session.user.email } }
      }
    })

    // Increment user's projectsThisMonth counter (use raw SQL to avoid TypeScript error if the field is not present in Prisma types)
    await prisma.$executeRaw`
      UPDATE "User"
      SET "projectsThisMonth" = COALESCE("projectsThisMonth", 0) + 1
      WHERE "email" = ${session.user.email}
    `

    return NextResponse.json(project)
  } catch (error) {
    console.error('Create project error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}