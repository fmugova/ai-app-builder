import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, subject, message, priority } = body;

    // Validate required fields
    if (!type || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

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
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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
