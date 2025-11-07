import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Get the current user session
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch actual subscription data from database
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id }
    });

    if (!subscription) {
      // Return default free plan if no subscription found
      return NextResponse.json({
        user: {
          name: session.user.name || 'User',
          email: session.user.email || 'user@example.com',
        },
        plan: 'Free',
        used: 0,
        limit: 3,
      });
    }

    const userData = {
      user: {
        name: session.user.name || 'User',
        email: session.user.email || 'user@example.com',
      },
      plan: subscription.plan,
      used: subscription.generationsUsed,
      limit: subscription.generationsLimit,
    };

    return NextResponse.json(userData);
  } catch (error) {
    console.error('Error fetching user usage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
