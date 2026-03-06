import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-middleware';

// Proxy /api/admin/analytics/Subscription → /api/admin/analytics/subscriptions
// Protected by withAdmin – only admin-role users may access this endpoint.
export const GET = withAdmin(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    url.pathname = url.pathname.replace(/\/Subscription/i, '/subscriptions');
    // Forward only safe, non-auth headers to avoid forwarding credentials twice
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Subscription analytics proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription analytics' }, { status: 500 });
  }
});
