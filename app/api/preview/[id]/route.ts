import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        code: true,
        html: true,
        htmlCode: true,
      },
    });

    if (!project) {
      return new NextResponse('Project not found', { status: 404 });
    }

    const code = project.code || project.html || project.htmlCode || '';

    if (!code) {
      return new NextResponse('No code available', { status: 404 });
    }

    return new NextResponse(code, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Preview error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}