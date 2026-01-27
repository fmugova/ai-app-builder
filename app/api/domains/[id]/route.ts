import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET function
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = params.id

    // ✅ CORRECT: Fetch first, then check ownership
    const domain = await prisma.customDomain.findUnique({
      where: { id: id as string },
      include: { Project: true }
    })

    // ✅ Check ownership AFTER fetching
    if (!domain || domain.Project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    return NextResponse.json(domain)
  } catch (error) {
    console.error('Error fetching domain:', error)
    return NextResponse.json({ error: 'Failed to fetch domain' }, { status: 500 })
  }
}

// DELETE function
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = params.id

    // ✅ CORRECT: Fetch first, then check ownership
    const domain = await prisma.customDomain.findUnique({
      where: { id: id as string },
      include: { Project: true }
    })

    // ✅ Check ownership AFTER fetching
    if (!domain || domain.Project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    await prisma.customDomain.delete({
      where: { id: id as string }
    })

    return NextResponse.json({ message: 'Domain deleted successfully' })
  } catch (error) {
    console.error('Error deleting domain:', error)
    return NextResponse.json({ error: 'Failed to delete domain' }, { status: 500 })
  }
}

// PATCH function
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = params.id
    const body = await request.json()

    // ✅ CORRECT: Fetch first, then check ownership
    const domain = await prisma.customDomain.findUnique({
      where: { id: id as string },
      include: { Project: true }
    })

    // ✅ Check ownership AFTER fetching
    if (!domain || domain.Project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    const updatedDomain = await prisma.customDomain.update({
      where: { id: id as string },
      data: body
    })

    return NextResponse.json(updatedDomain)
  } catch (error) {
    console.error('Error updating domain:', error)
    return NextResponse.json({ error: 'Failed to update domain' }, { status: 500 })
  }
}