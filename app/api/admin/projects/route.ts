import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminAsync } from '@/lib/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await isAdminAsync())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const projects = await prisma.project.findMany({
      include: {
        User: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    
    // Helper to serialize BigInt fields
    function serializeProject(project: any) {
      return {
        ...project,
        generationTime: project.generationTime ? Number(project.generationTime) : null,
        retryCount: project.retryCount ? Number(project.retryCount) : null,
        tokensUsed: project.tokensUsed ? Number(project.tokensUsed) : null,
        validationScore: project.validationScore ? Number(project.validationScore) : null,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      };
    }
    
    const serializedProjects = projects.map(serializeProject);
    
    // Return projects directly as an array (not nested in an object)
    return NextResponse.json(serializedProjects);
  } catch (error) {
    console.error('Error fetching all projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}
