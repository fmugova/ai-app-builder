// ============================================================================
// FIXED PROJECT GET API - app/api/projects/[id]/route.ts
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/projects/[id]
 * Load project with multi-field code check
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    console.log('🔍 Loading project:', id);

    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        code: true,
        html: true,        // ✅ Load all code fields
        htmlCode: true,    // ✅ Load all code fields
        hasHtml: true,
        hasCss: true,
        hasJavaScript: true,
        isComplete: true,
        validationPassed: true,
        validationScore: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        status: true,
      }
    });

    if (!project) {
      console.error('❌ Project not found:', id);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // ✅ Check if user owns project
    if (project.userId !== session.user.id) {
      console.error('❌ Unauthorized access to project:', id);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // ✅ FIX: Check ALL code fields and use first available
    const code = project.code || project.html || project.htmlCode || '';

    console.log('📦 Project loaded:', {
      id: project.id,
      name: project.name,
      codeLength: project.code?.length || 0,
      htmlLength: project.html?.length || 0,
      htmlCodeLength: project.htmlCode?.length || 0,
      finalCodeLength: code.length,
      hasHtml: project.hasHtml,
      isComplete: project.isComplete
    });

    if (!code) {
      console.warn('⚠️ Project has no code in any field');
    }

    // Return project with unified code field
    return NextResponse.json({
      ...project,
      code, // ✅ Use the first available code field
    });

  } catch (error) {
    console.error('❌ API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]
 * Update project - also save to all code fields
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { name, code, description, type } = body;

    console.log('💾 Updating project:', id, {
      codeLength: code?.length || 0
    });

    // Check ownership
    const existing = await prisma.project.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // ✅ Update ALL code fields
    const updated = await prisma.project.update({
      where: { id },
      data: {
        name,
        description,
        type,
        code,           // ✅ Save to all fields
        html: code,     // ✅ Save to all fields
        htmlCode: code, // ✅ Save to all fields
        hasHtml: !!code,
        isComplete: !!code,
        updatedAt: new Date(),
      },
    });

    console.log('✅ Project updated:', id);

    return NextResponse.json(updated);

  } catch (error) {
    console.error('❌ Update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]
 * Delete project
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Check ownership
    const existing = await prisma.project.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.project.delete({
      where: { id },
    });

    console.log('🗑️ Project deleted:', id);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}