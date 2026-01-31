// app/api/domains/[id]/verify/route.ts
// ✅ FIXED: Complete function with Next.js 15 async params

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyDomain } from '@/lib/vercel-domains';

// ✅ Interface matches parent folder [id]
interface RouteContext {
  params: Promise<{ id: string }>;
}

// ✅ COMPLETE function declaration (was missing!)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // ✅ Extract id from params
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'Missing domain ID.' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get domain from database
    const domain = await prisma.customDomain.findFirst({
      where: {
        id: id,
        Project: {
          User: {
            email: session.user.email
          }
        }
      }
    });

    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Verify with Vercel
    const result = await verifyDomain(domain.domain);

    // Update database
    await prisma.customDomain.update({
      where: { id: id },
      data: {
        status: result.verified ? 'active' : 'pending',
        verifiedAt: result.verified ? new Date() : null
      }
    });

    if (result.verified) {
      return NextResponse.json({ 
        success: true, 
        message: 'Domain verified successfully.' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Domain verification failed. Check DNS records.' 
      }, { status: 400 });
    }

  } catch (error: unknown) {
    console.error('Domain verify error:', error);
    const errorMessage = typeof error === 'object' && error && 'message' in error 
      ? (error as { message?: string }).message 
      : String(error);
    
    return NextResponse.json(
      { error: 'Failed to verify domain', message: errorMessage },
      { status: 500 }
    );
  }
}