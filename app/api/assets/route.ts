import { list, del } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json([], { status: 200 })
  }

  const { blobs } = await list({ prefix: `assets/${session.user.id}/` })

  return NextResponse.json(
    blobs.map(b => ({
      url: b.url,
      filename: decodeURIComponent(b.pathname.split('/').pop() || b.pathname),
      size: b.size,
      uploadedAt: b.uploadedAt,
    }))
  )
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { url } = await req.json()

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  // Security: only allow deleting blobs that belong to this user
  if (!url.includes(`/assets/${session.user.id}/`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await del(url)
  return NextResponse.json({ success: true })
}
