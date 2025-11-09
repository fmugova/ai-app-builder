export const runtime = 'nodejs'; // Force Node.js runtime instead of Edge
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
      where: { userId: session.user.id },
    });

    // If no subscription exists, create a default free one
    if (!subscription) {
      const newSubscription = await prisma.subscription.create({
        data: {
          userId: session.user.id,
          plan: 'free',
          generationsLimit: 3,
          generationsUsed: 0,
          stripeCustomerId: `temp_${Date.now()}`,
        },
      });

      return NextResponse.json({
        user: {
          name: session.user.name || 'User',
          email: session.user.email || 'user@example.com',
        },
        plan: newSubscription.plan.charAt(0).toUpperCase() + newSubscription.plan.slice(1),
        used: newSubscription.generationsUsed,
        limit: newSubscription.generationsLimit,
      });
    }

    const userData = {
      user: {
        name: session.user.name || 'User',
        email: session.user.email || 'user@example.com',
      },
      plan: subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1),
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
