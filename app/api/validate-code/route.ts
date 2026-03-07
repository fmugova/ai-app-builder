import { NextRequest, NextResponse } from 'next/server';
import CodeValidator from '@/lib/validators/code-validator';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Rate limit: anonymous callers identified by IP, 30 req/min
    const rl = await checkRateLimit(req, 'general');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Code is required' },
        { status: 400 }
      );
    }

    const validator = new CodeValidator();
    const result = validator.validateAll(code, '', '');

    return NextResponse.json({
      validation: result,
    });
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: 'Validation failed' },
      { status: 500 }
    );
  }
}
