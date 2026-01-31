// This file was migrated from middleware.ts as per Next.js 16+ requirements.
// See: https://nextjs.org/docs/messages/middleware-to-proxy

import { NextRequest, NextResponse } from 'next/server';

// ...existing middleware logic...

export function proxy(request: NextRequest) {
  // ...existing logic...
  return NextResponse.next();
}
