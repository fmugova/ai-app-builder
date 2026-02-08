import { NextResponse } from 'next/server';
import { validateCode } from '@/lib/validators/code-validator';
import { autoFixCode } from '@/lib/validators/auto-fixer';
import { ensureValidHTML } from '@/lib/templates/htmlTemplate';

/**
 * Test endpoint to verify validation pipeline
 * Tests each layer individually: validation → auto-fix → re-validation → template wrapper
 * 
 * Usage:
 * POST /api/test-validation
 * Body: { "html": "<html><body>Test</body></html>" }
 */
export async function POST(request: Request) {
  try {
    const { html } = await request.json();

    if (!html || typeof html !== 'string') {
      return NextResponse.json(
        { error: 'HTML string required in request body' },
        { status: 400 }
      );
    }

    console.log('🧪 Testing validation system...');
    console.log('📝 Input HTML length:', html.length);
    
    // ========================================================================
    // STEP 1: Initial Validation
    // ========================================================================
    console.log('\n=== STEP 1: INITIAL VALIDATION ===');
    const validation = validateCode(html);
    console.log('📊 Validation results:', {
      score: validation.score,
      passed: validation.passed,
      errors: validation.summary.errors,
      warnings: validation.summary.warnings,
      info: validation.summary.info,
    });

    // ========================================================================
    // STEP 2: Auto-Fix
    // ========================================================================
    console.log('\n=== STEP 2: AUTO-FIX ===');
    const fixResult = autoFixCode(html, validation);
    console.log('🔧 Applied fixes:', fixResult.appliedFixes);
    console.log('📏 Code length change:', html.length, '→', fixResult.fixed.length);

    // ========================================================================
    // STEP 3: Re-Validation After Auto-Fix
    // ========================================================================
    console.log('\n=== STEP 3: RE-VALIDATION AFTER AUTO-FIX ===');
    const revalidation = validateCode(fixResult.fixed);
    console.log('📊 Re-validation results:', {
      score: revalidation.score,
      passed: revalidation.passed,
      errors: revalidation.summary.errors,
      warnings: revalidation.summary.warnings,
    });

    // ========================================================================
    // STEP 4: Template Wrapper (if score < 90)
    // ========================================================================
    console.log('\n=== STEP 4: TEMPLATE WRAPPER CHECK ===');
    let finalHtml = fixResult.fixed;
    let finalValidation = revalidation;
    let templateWrapperApplied = false;

    if (revalidation.score < 90) {
      console.log('⚠️ Score too low (' + revalidation.score + '), applying template wrapper');
      finalHtml = ensureValidHTML(fixResult.fixed, 'Test Application');
      templateWrapperApplied = true;

      // Final validation after template wrapper
      finalValidation = validateCode(finalHtml);
      console.log('📊 Final validation after template wrapper:', {
        score: finalValidation.score,
        passed: finalValidation.passed,
        errors: finalValidation.summary.errors,
        warnings: finalValidation.summary.warnings,
      });
    } else {
      console.log('✅ Score acceptable (' + revalidation.score + '), skipping template wrapper');
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('\n=== SUMMARY ===');
    console.log('Original score:', validation.score);
    console.log('After auto-fix:', revalidation.score, '(+' + (revalidation.score - validation.score) + ')');
    console.log('Final score:', finalValidation.score);
    console.log('Template wrapper used:', templateWrapperApplied);

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
    console.error('❌ Test validation error:', error);
    return NextResponse.json(
      { 
        error: 'Test validation failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to show usage instructions
 */
export async function GET() {
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
