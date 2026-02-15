import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET — single template (increments view count)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  const template = await prisma.template.findFirst({
    where: { id, status: 'PUBLISHED' },
    include: { User: { select: { name: true } } },
  })

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  // Increment views (non-blocking)
  prisma.template.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => {})

  let owned = template.tier === 'FREE'
  if (!owned && session?.user?.id) {
    const purchase = await prisma.templatePurchase.findUnique({
      where: { templateId_userId: { templateId: id, userId: session.user.id } },
    })
    owned = !!purchase
  }

  return NextResponse.json({
    ...template,
    creatorName: template.User?.name || 'BuildFlow',
    owned,
    // Only expose code if owned
    htmlCode: owned ? template.htmlCode : null,
    cssCode: owned ? template.cssCode : null,
    jsCode: owned ? template.jsCode : null,
  })
}

// DELETE — creator can delete their own template
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const template = await prisma.template.findFirst({ where: { id, creatorId: session.user.id } })
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.template.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
