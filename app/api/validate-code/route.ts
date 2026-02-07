import { NextRequest, NextResponse } from 'next/server';
import CodeValidator from '@/lib/validators/code-validator';

export async function POST(req: NextRequest) {
  try {
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
