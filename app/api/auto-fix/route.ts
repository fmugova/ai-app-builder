import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { autoFixCode } from '@/lib/validators/auto-fixer';
import type { ValidationResult } from '@/lib/validators/code-validator';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { code, validation } = await req.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Code is required' },
        { status: 400 }
      );
    }

    if (!validation) {
      return NextResponse.json(
        { error: 'Validation result is required' },
        { status: 400 }
      );
    }

    const autoFix = autoFixCode(code, validation as ValidationResult);

    return NextResponse.json({
      fixed: autoFix.fixed,
      autoFix: {
        appliedFixes: autoFix.appliedFixes,
        remainingIssues: autoFix.remainingIssues,
      },
    });
  } catch (error) {
    console.error('Auto-fix error:', error);
    return NextResponse.json(
      { error: 'Auto-fix failed' },
      { status: 500 }
    );
  }
}
