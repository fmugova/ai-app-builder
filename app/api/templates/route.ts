import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET — list published templates (+ creator's own drafts if authenticated)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const tier = searchParams.get('tier')
  const mine = searchParams.get('mine') === 'true'

  const session = await getServerSession(authOptions)

  try {
    const where: Record<string, unknown> = {}

    if (mine && session?.user?.id) {
      where.creatorId = session.user.id
    } else {
      where.status = 'PUBLISHED'
    }

    if (category && category !== 'all') where.category = category
    if (tier && tier !== 'all') where.tier = tier.toUpperCase()

    const templates = await prisma.template.findMany({
      where,
      orderBy: [{ downloads: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        tier: true,
        price: true,
        thumbnail: true,
        tags: true,
        downloads: true,
        views: true,
        rating: true,
        reviewCount: true,
        status: true,
        createdAt: true,
        creatorId: true,
        User: { select: { name: true } },
      },
    })

    // If authenticated, annotate which templates the user already owns
    let purchasedIds = new Set<string>()
    if (session?.user?.id) {
      const purchases = await prisma.templatePurchase.findMany({
        where: { userId: session.user.id },
        select: { templateId: true },
      })
      purchasedIds = new Set(purchases.map(p => p.templateId))
    }

    return NextResponse.json(
      templates.map(t => ({
        ...t,
        creatorName: t.User?.name || 'BuildFlow',
        owned: purchasedIds.has(t.id) || t.tier === 'FREE',
      }))
    )
  } catch (err) {
    console.error('Templates list error:', err)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

// POST — create a new template (authenticated creators)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  try {
    const body = await req.json()
    const { name, description, category, tier, price, htmlCode, cssCode, jsCode, tags, thumbnail } = body

    if (!name || !description || !category || !htmlCode) {
      return NextResponse.json({ error: 'name, description, category, and htmlCode are required' }, { status: 400 })
    }

    const resolvedTier = (tier || 'FREE').toUpperCase() as 'FREE' | 'PRO' | 'COLLECTION'
    const resolvedPrice = resolvedTier === 'FREE' ? 0 : (price || (resolvedTier === 'PRO' ? 9.99 : 49.99))

    const template = await prisma.template.create({
      data: {
        creatorId: user.id,
        name,
        description,
        category,
        tier: resolvedTier,
        price: resolvedPrice,
        htmlCode,
        cssCode: cssCode || '',
        jsCode: jsCode || '',
        tags: tags || [],
        thumbnail: thumbnail || null,
        status: 'PUBLISHED', // auto-publish; add admin review step later
      },
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (err) {
    console.error('Template create error:', err)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}
