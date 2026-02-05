import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Validation schema
const feedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'general', 'improvement', 'other']),
  subject: z.string().min(1, 'Subject is required').max(255),
  message: z.string().min(1, 'Message is required').max(5000, 'Message too long'),
  priority: z.enum(['low', 'medium', 'high']).optional()
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate input
    const body = await request.json();
    const { type, subject, message, priority } = feedbackSchema.parse(body);

    // Create feedback in database
    const feedback = await prisma.feedback.create({
      data: {
        userId: session.user.id,
        type: type || 'general',
        subject,
        message,
        priority: priority || 'medium',
        status: 'pending',
      },
    });

    // Optional: Send notification email to admin
    // await sendFeedbackNotification(feedback);

    return NextResponse.json(
      { 
        success: true, 
        feedback: {
          id: feedback.id,
          createdAt: feedback.createdAt,
        }
      },
      { status: 201 }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: error.errors.map(e => e.message)
        },
        { status: 400 }
      );
    }
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's feedback history
    const feedbacks = await prisma.feedback.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return NextResponse.json({ feedbacks });

  } catch (error) {
    console.error('Feedback GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}
