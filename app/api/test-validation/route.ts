import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { validateCode } from '@/lib/validators/code-validator';
import { autoFixCode } from '@/lib/validators/auto-fixer';
import { ensureValidHTML } from '@/lib/templates/htmlTemplate';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Internal test endpoint to verify validation pipeline — admin only.
 */
export async function POST(request: NextRequest) {
  // Admin-only guard
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const actor = await prisma.user.findFirst({ where: { email: session.user.email }, select: { role: true } });
  if (actor?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { html } = await request.json();

    if (!html || typeof html !== 'string') {
      return NextResponse.json(
        { error: 'HTML string required in request body' },
        { status: 400 }
      );
    }
    
    // Step 1: Initial Validation
    const validation = validateCode(html);

    // Step 2: Auto-Fix
    const fixResult = autoFixCode(html, validation);

    // Step 3: Re-Validation After Auto-Fix
    const revalidation = validateCode(fixResult.fixed);

    // Step 4: Template wrapper (if score < 90)
    let finalHtml = fixResult.fixed;
    let finalValidation = revalidation;
    let templateWrapperApplied = false;

    if (revalidation.score < 90) {
      finalHtml = ensureValidHTML(fixResult.fixed, 'Test Application');
      templateWrapperApplied = true;
      finalValidation = validateCode(finalHtml);
    }

    return NextResponse.json({
      success: true,
      stages: {
        step1_original: {
          score: validation.score,
          passed: validation.passed,
          errors: validation.summary.errors,
          warnings: validation.summary.warnings,
          issues: validation.errors.concat(validation.warnings).map(issue => ({
            severity: issue.severity,
            message: issue.message,
          })),
        },
        step2_autoFix: {
          appliedFixes: fixResult.appliedFixes,
          remainingIssues: fixResult.remainingIssues,
          codeLengthBefore: html.length,
          codeLengthAfter: fixResult.fixed.length,
        },
        step3_revalidation: {
          score: revalidation.score,
          passed: revalidation.passed,
          errors: revalidation.summary.errors,
          warnings: revalidation.summary.warnings,
          scoreImprovement: revalidation.score - validation.score,
        },
        step4_templateWrapper: {
          applied: templateWrapperApplied,
          score: finalValidation.score,
          passed: finalValidation.passed,
          errors: finalValidation.summary.errors,
          warnings: finalValidation.summary.warnings,
        },
      },
      finalCode: finalHtml,
      summary: {
        originalScore: validation.score,
        finalScore: finalValidation.score,
        improvement: finalValidation.score - validation.score,
        allStepsNeeded: templateWrapperApplied,
      },
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Test validation failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Admin-only guard
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const actor = await prisma.user.findFirst({ where: { email: session.user.email }, select: { role: true } });
  if (actor?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json({
    endpoint: '/api/test-validation',
    method: 'POST',
    description: 'Test the validation pipeline with custom HTML',
    usage: {
      curl: `curl -X POST http://localhost:3000/api/test-validation \\
  -H "Content-Type: application/json" \\
  -d '{"html": "<html><body>Test</body></html>"}'`,
      body: {
        html: 'string (required) - HTML code to test',
      },
    },
    example: {
      html: '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Test</title></head><body><h1>Test Page</h1><p>Content here</p></body></html>',
    },
    pipeline: [
      'Step 1: Initial validation of raw HTML',
      'Step 2: Auto-fix applies corrections',
      'Step 3: Re-validation after auto-fix',
      'Step 4: Template wrapper (only if score < 90)',
    ],
  });
}
