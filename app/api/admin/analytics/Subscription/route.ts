import { NextRequest, NextResponse } from 'next/server';

// Proxy or redirect /api/admin/analytics/Subscription to /api/admin/analytics/subscriptions
export async function GET(request: NextRequest) {
  // Rewrite the request to the correct endpoint
  const url = new URL(request.url);
  url.pathname = url.pathname.replace(/\/Subscription/i, '/subscriptions');
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: Object.fromEntries(request.headers.entries()),
    cache: 'no-store',
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
