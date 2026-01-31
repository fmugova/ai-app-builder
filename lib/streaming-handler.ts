/**
 * Streaming Handler with Code Validation
 * Integration for BuildFlow AI API Route
 */

import { validateGeneratedCode, isCodeComplete, ValidationResult } from './code-validator';
import Anthropic from '@anthropic-ai/sdk';

interface StreamingState {
  html: string;
  css: string;
  js: string;
  accumulatedCode: string;
  isComplete: boolean;
  validation?: ValidationResult;
}

/**
 * Process streaming response from Claude API
 * Returns validated and complete code only
 */
export async function processStreamingResponse(
  stream: AsyncIterable<Anthropic.MessageStreamEvent>,
  onProgress?: (state: StreamingState) => void
): Promise<StreamingState> {
  const state: StreamingState = {
    html: '',
    css: '',
    js: '',
    accumulatedCode: '',
    isComplete: false,
  };

  try {
    for await (const event of stream) {
      // Handle content block delta
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        state.accumulatedCode += event.delta.text;

        // Extract code blocks as they stream in
        const extracted = extractCodeBlocks(state.accumulatedCode);
        state.html = extracted.html;
        state.css = extracted.css;
        state.js = extracted.js;

        // Call progress callback
        if (onProgress) {
          onProgress(state);
        }
      }

      // Handle message completion
      if (event.type === 'message_stop' || event.type === 'content_block_stop') {
        state.isComplete = true;

        // Final extraction
        const extracted = extractCodeBlocks(state.accumulatedCode);
        state.html = extracted.html;
        state.css = extracted.css;
        state.js = extracted.js;

        // CRITICAL: Validate before returning
        state.validation = validateGeneratedCode({
          html: state.html,
          css: state.css,
          js: state.js,
        });

        // Log validation results
        if (!state.validation.validationPassed) {
          console.error('❌ Code validation failed:', {
            errors: state.validation.errors,
            score: state.validation.validationScore,
          });
        } else {
          console.log('✅ Code validation passed');
        }
      }
    }
  } catch (error) {
    console.error('Error processing stream:', error);
    throw error;
  }

  return state;
}

/**
 * Extract HTML, CSS, and JS from markdown code blocks
 */
function extractCodeBlocks(text: string): { html: string; css: string; js: string } {
  const result = {
    html: '',
    css: '',
    js: '',
  };

  // Extract HTML
  const htmlMatch = text.match(/```html\n([\s\S]*?)```/i);
  if (htmlMatch) {
    result.html = htmlMatch[1].trim();
  }

  // Extract CSS
  const cssMatch = text.match(/```css\n([\s\S]*?)```/i);
  if (cssMatch) {
    result.css = cssMatch[1].trim();
  }

  // Extract JavaScript
  const jsMatch = text.match(/```(?:javascript|js)\n([\s\S]*?)```/i);
  if (jsMatch) {
    result.js = jsMatch[1].trim();
  }

  return result;
}

/**
 * Check if streaming should continue or stop
 * Prevents saving incomplete code mid-stream
 */
export function shouldSaveCode(state: StreamingState): boolean {
  // Don't save if not complete
  if (!state.isComplete) {
    return false;
  }

  // Don't save if validation failed
  if (state.validation && !state.validation.validationPassed) {
    return false;
  }

  // Don't save if critical code is missing
  if (!state.html || state.html.trim() === '') {
    return false;
  }

  // Check if each code type is complete
  if (state.html && !isCodeComplete(state.html, 'html')) {
    console.warn('⚠️ HTML appears incomplete');
    return false;
  }

  if (state.css && !isCodeComplete(state.css, 'css')) {
    console.warn('⚠️ CSS appears incomplete');
    return false;
  }

  if (state.js && !isCodeComplete(state.js, 'js')) {
    console.warn('⚠️ JavaScript appears incomplete');
    return false;
  }

  return true;
}

/**
 * Get user-friendly error message for validation failures
 */
export function getValidationErrorMessage(validation: ValidationResult): string {
  if (validation.validationPassed) {
    return '';
  }

  const errorMessages = validation.errors.map(e => e.message);

  // Categorize errors
  const hasSyntaxErrors = validation.errors.some(e => e.type === 'syntax');
  const hasCompletenessErrors = validation.errors.some(e => e.type === 'completeness');

  if (hasSyntaxErrors && hasCompletenessErrors) {
    return "This app's JavaScript failed to generate correctly and is not running. Please try regenerating or contact support.";
  } else if (hasSyntaxErrors) {
    return `JavaScript syntax error: ${errorMessages[0]}`;
  } else if (hasCompletenessErrors) {
    return "The code generation was interrupted. Please try regenerating.";
  }

  return `Code validation failed: ${errorMessages[0]}`;
}

/**
 * Example API route integration
 */
export async function exampleAPIRouteHandler(prompt: string) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Start streaming
  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Process with validation
  const result = await processStreamingResponse(stream, (state) => {
    // Optional: Send progress updates to client
    console.log(`Progress: ${state.accumulatedCode.length} characters`);
  });

  // Check if code should be saved
  if (!shouldSaveCode(result)) {
    throw new Error(
      result.validation 
        ? getValidationErrorMessage(result.validation)
        : 'Code generation failed - incomplete or invalid code'
    );
  }

  return {
    html: result.html,
    css: result.css,
    js: result.js,
    validation: result.validation,
  };
}
