// app/api/projects/[id]/env-vars/export/route.ts
// Export environment variables as .env file

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateEnvFile, decrypt } from '@/lib/encryption'
import { logSecurityEvent } from '@/lib/security'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const environment = searchParams.get('environment') || 'all'
    const format = searchParams.get('format') || 'env' // 'env' or 'json'

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        User: { email: session.user.email }
      },
      include: {
        environmentVariables: {
          where: environment !== 'all' ? { environment } : {},
          orderBy: { key: 'asc' }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get user for logging
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    // Decrypt values
    const variables = project.environmentVariables.map(v => ({
      key: v.key,
      value: decrypt(v.value),
      description: v.description || undefined
    }))

    // Log security event
    if (user) {
      await logSecurityEvent({
        userId: user.id,
        type: 'env_vars_exported',
        action: 'success',
        metadata: {
          projectId: id,
          environment,
          count: variables.length,
          format
        },
        severity: 'info'
      })
    }

    if (format === 'json') {
      // Export as JSON
      return NextResponse.json({
        project: project.name,
        environment,
        exportedAt: new Date().toISOString(),
        variables
      })
    } else {
      // Export as .env file
      const envContent = generateEnvFile(variables)

      return new Response(envContent, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="${project.name}-${environment}.env"`
        }
      })
    }
  } catch (error) {
    console.error('Export env vars error:', error)
    return NextResponse.json(
      { error: 'Failed to export environment variables' },
      { status: 500 }
    )
  }
}
