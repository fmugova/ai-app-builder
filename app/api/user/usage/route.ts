export const runtime = 'nodejs'; // Force Node.js runtime instead of Edge
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

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

    // TODO: Replace this with your actual database query
    // For now, return mock data
    const userData = {
      user: {
        name: session.user.name || 'User',
        email: session.user.email || 'user@example.com',
      },
      plan: 'Free', // TODO: Get from database
      used: 0,      // TODO: Get actual usage from database
      limit: 3,     // Free plan limit
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
