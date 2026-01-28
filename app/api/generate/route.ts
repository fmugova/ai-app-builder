// app/api/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { MessageCreateParams } from '@anthropic-ai/sdk/resources/messages';
import type { Stream } from '@anthropic-ai/sdk/streaming';
import { prisma } from '@/lib/prisma';
import { parseGeneratedCode, analyzeCodeQuality, checkCSPViolations } from '@/lib/code-parser';
import { ProjectStatus } from '@prisma/client';
import { apiQueue } from '@/lib/api-queue';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Token limit configuration based on generation complexity
const TOKEN_LIMITS = {
  simple: 15000,
  webapp: 25000,
  ecommerce: 35000,
  complex: 50000,
  maximum: 180000,
} as const;

type GenerationType = keyof typeof TOKEN_LIMITS;

// Request body type
interface GenerateRequest {
  prompt: string;
  projectId?: string;
  generationType?: string;
  retryAttempt?: number;
  continuationContext?: string | null;
}

// Stream event types
interface StreamEvent {
  type: 'content' | 'retry' | 'complete' | 'error';
  text?: string;
  totalLength?: number;
  message?: string;
  attempt?: number;
  parsed?: {
    hasHtml: boolean;
    hasCss: boolean;
    hasJavaScript: boolean;
    isComplete: boolean;
  };
  metadata?: {
    tokensUsed: number;
    generationTime: number;
    wasTruncated: boolean;
    stopReason: string;
  };
  error?: string;
}

// Anthropic error type
interface AnthropicError extends Error {
  error?: {
    type?: string;
  };
}

// ============================================================================
// RETRY LOGIC FOR API OVERLOAD ERRORS
// ============================================================================

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

async function createMessageWithRetry(
  anthropic: Anthropic,
  params: MessageCreateParams,
  retryCount = 0
): Promise<Stream<Anthropic.Messages.MessageStreamEvent>> {
  try {
    const result = await anthropic.messages.create(params);
    
    // TypeScript check for async iterator
    if (result && typeof (result as Stream<Anthropic.Messages.MessageStreamEvent>)[Symbol.asyncIterator] === 'function') {
      return result as Stream<Anthropic.Messages.MessageStreamEvent>;
    } else {
      throw new Error('Expected a streaming response (AsyncIterable), but got a non-streaming result.');
    }
  } catch (error) {
    const anthropicError = error as AnthropicError;
    const isOverloadError =
      anthropicError?.error?.type === 'overloaded_error' ||
      anthropicError?.message?.includes('overloaded') ||
      anthropicError?.message?.includes('Overloaded');

    if (isOverloadError && retryCount < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`⏳ API overloaded, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return createMessageWithRetry(anthropic, params, retryCount + 1);
    }
    
    if (retryCount >= MAX_RETRIES) {
      throw new Error(
        `API is currently overloaded. Tried ${MAX_RETRIES} times. Please try again in a few minutes.`
      );
    }
    
    throw error;
  }
}

// Calculate optimal token limit based on prompt and generation type
function getOptimalTokenLimit(prompt: string, generationType: string = 'webapp'): number {
  const estimatedPromptTokens = Math.ceil(prompt.length / 4);
  const genType = (TOKEN_LIMITS[generationType as GenerationType]) 
    ? generationType as GenerationType 
    : 'webapp';
  const baseOutputTokens = TOKEN_LIMITS[genType];
  const totalNeeded = Math.ceil((estimatedPromptTokens + baseOutputTokens) * 1.2);
  const optimal = Math.min(totalNeeded, TOKEN_LIMITS.maximum);
  
  console.log(`📊 Token calculation:`, {
    promptTokens: estimatedPromptTokens,
    baseOutput: baseOutputTokens,
    optimal,
    generationType: genType
  });
  
  return optimal;
}

// Enterprise-grade system prompt for production-ready code generation
const ENTERPRISE_SYSTEM_PROMPT = `You are an expert full-stack developer generating production-ready, VISUALLY STUNNING web applications.

🎨 CRITICAL DESIGN REQUIREMENTS:

1. ALWAYS CREATE BEAUTIFUL, COLORFUL DESIGNS:
   ✅ Use vibrant, modern color palettes (gradients, shadows, colors)
   ✅ Add professional styling with depth and visual interest
   ✅ Include hover effects, transitions, and micro-interactions
   ✅ Make it look like a professional SaaS product
   ❌ NEVER create plain white/gray designs
   ❌ NEVER use default browser styling
   
2. MODERN COLOR SCHEMES (Pick one that fits the app):
   Option 1 - Tech/SaaS: Blue gradients (#2563eb → #7c3aed)
   Option 2 - Creative: Purple/Pink (#8b5cf6 → #ec4899)
   Option 3 - Professional: Navy/Teal (#0f172a → #14b8a6)
   Option 4 - Energetic: Orange/Red (#f97316 → #dc2626)
   Option 5 - Nature: Green (#10b981 → #059669)

3. VISUAL ELEMENTS (MANDATORY):
   ✅ Gradient backgrounds or colored sections
   ✅ Card shadows and depth (box-shadow)
   ✅ Rounded corners on buttons and cards
   ✅ Icon usage with emojis or symbols
   ✅ Colored accents and highlights
   ✅ Beautiful typography with varied sizes
   ✅ Smooth transitions on all interactive elements

4. CSP COMPLIANCE (STILL REQUIRED):
   ❌ NEVER use inline styles: style="color: red"
   ❌ NEVER use inline handlers: onclick="doSomething()"
   ✅ ALWAYS use external CSS classes
   ✅ ALWAYS use data attributes: data-action="submit"
   ✅ ALWAYS attach events in JavaScript: addEventListener

5. SECURITY:
   ✅ ALWAYS escape user input with escapeHtml() function
   ✅ ALWAYS wrap localStorage in try-catch blocks
   ✅ NEVER use eval(), Function(), or string-based setTimeout
   ✅ ALWAYS validate form inputs before processing

6. ARCHITECTURE:
   ✅ Use class-based architecture (ES6+ classes)
   ✅ Separate concerns: State, UI, Controllers
   ✅ Avoid global variables - encapsulate in classes
   ✅ Use static methods for utility functions

7. ERROR HANDLING:
   ✅ Wrap all localStorage calls in try-catch
   ✅ Add global error handlers: window.addEventListener('error')
   ✅ Show user-friendly error messages via toast notifications
   ✅ Log errors to console for debugging

8. ACCESSIBILITY:
   ✅ Add aria-label to icon buttons
   ✅ Use semantic HTML (main, header, footer, nav)
   ✅ Add role="dialog" to modals
   ✅ Include keyboard navigation support (Escape to close)
   ✅ Add aria-live="polite" to notification areas

OUTPUT FORMAT (MANDATORY):
You must provide your code in exactly this format with clear markdown code blocks:

## HTML
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>App Title</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <!-- Full HTML content with semantic structure -->
    <header class="header">
        <!-- Beautiful header with gradient or color -->
    </header>
    
    <main class="main-content">
        <!-- Main content with cards, sections, visual interest -->
    </main>
    
    <footer class="footer">
        <!-- Styled footer -->
    </footer>
    
    <div id="toastContainer" class="toast-container"></div>
    <script src="script.js"></script>
</body>
</html>
\`\`\`

## CSS
\`\`\`css
/* 🎨 BEAUTIFUL, PROFESSIONAL STYLING - MANDATORY */

:root {
    /* Choose a vibrant color scheme */
    --primary: #2563eb;
    --primary-dark: #1e40af;
    --primary-light: #60a5fa;
    
    --secondary: #8b5cf6;
    --secondary-dark: #7c3aed;
    
    --accent: #10b981;
    --accent-dark: #059669;
    
    --background: #f8fafc;
    --surface: #ffffff;
    --text: #1e293b;
    --text-light: #64748b;
    
    --spacing: 1rem;
    --radius: 12px;
    --shadow: 0 4px 24px rgba(0,0,0,0.08);
    --shadow-lg: 0 20px 60px rgba(0,0,0,0.15);
    
    --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--background);
    color: var(--text);
    line-height: 1.6;
}

/* 🎨 BEAUTIFUL HEADER WITH GRADIENT */
.header {
    background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
    color: white;
    padding: 2rem;
    box-shadow: var(--shadow-lg);
}

/* 🎨 CARDS WITH DEPTH AND STYLE */
.card {
    background: var(--surface);
    border-radius: var(--radius);
    padding: 1.5rem;
    box-shadow: var(--shadow);
    transition: var(--transition);
}

.card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
}

/* 🎨 BEAUTIFUL BUTTONS */
.btn {
    background: linear-gradient(135deg, var(--primary), var(--primary-dark));
    color: white;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: var(--radius);
    font-weight: 600;
    cursor: pointer;
    transition: var(--transition);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
}

.btn:active {
    transform: translateY(0);
}

/* 🎨 GRADIENT SECTIONS */
.section-gradient {
    background: linear-gradient(135deg, var(--primary-light), var(--secondary));
    padding: 4rem 2rem;
    color: white;
}

/* Toast notifications with style */
.toast-container { 
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
}

.toast {
    background: white;
    padding: 1rem 1.5rem;
    border-radius: var(--radius);
    box-shadow: var(--shadow-lg);
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
    from {
        transform: translateX(400px);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.toast.success { border-left: 4px solid var(--accent); }
.toast.error { border-left: 4px solid #ef4444; }
.toast.info { border-left: 4px solid var(--primary); }

/* Responsive design */
@media (max-width: 768px) { 
    .header { padding: 1.5rem; }
    .card { padding: 1rem; }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) { 
    * { 
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }
}
\`\`\`

## JavaScript
\`\`\`javascript
// Configuration
const CONFIG = {
    STORAGE_KEY: 'appData',
    TOAST_DURATION: 3000
};

// State Management
class AppState {
    constructor() {
        this.data = [];
        this.loadFromStorage();
    }
    
    loadFromStorage() {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (saved) this.data = JSON.parse(saved);
        } catch (error) {
            console.error('Storage error:', error);
        }
    }
    
    save() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.data));
        } catch (error) {
            console.error('Save error:', error);
            ToastManager.show('Failed to save data', 'error');
        }
    }
}

// UI Rendering
class UIRenderer {
    static render() { 
        // Render logic here
    }
    
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Toast Notifications
class ToastManager {
    static show(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = \`toast \${type}\`;
        
        const iconSpan = document.createElement('span');
        iconSpan.className = 'toast-icon';
        iconSpan.textContent = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
        
        const messageSpan = document.createElement('span');
        messageSpan.className = 'toast-message';
        messageSpan.textContent = message;
        
        toast.appendChild(iconSpan);
        toast.appendChild(messageSpan);
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, CONFIG.TOAST_DURATION);
    }
}

// Initialize
const appState = new AppState();

function initializeApp() {
    console.log('✨ App initialized successfully');
    // Your initialization code here
}

// Global error handlers
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    ToastManager.show('An unexpected error occurred', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    ToastManager.show('An unexpected error occurred', 'error');
});

// Start application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
\`\`\`

🎨 DESIGN CHECKLIST (Must include ALL):
✅ Vibrant color scheme (gradients preferred)
✅ Card shadows and depth
✅ Hover effects on all interactive elements
✅ Smooth transitions (0.3s cubic-bezier)
✅ Rounded corners (12px recommended)
✅ Beautiful typography with size hierarchy
✅ Colored accents and highlights
✅ Professional spacing and layout
✅ Gradient backgrounds or colored sections
✅ Visual feedback on user actions

IMPORTANT: 
- Create BEAUTIFUL, PROFESSIONAL designs from the start
- Make it look like a modern SaaS product (Stripe, Linear, Vercel style)
- Use gradients, shadows, and colors liberally
- Every element should have visual polish
- Write COMPLETE code in each section
- Do NOT use "..." or placeholders
- Do NOT truncate any code
- ALWAYS complete the current code block
- ALWAYS use textContent or createElement, NEVER innerHTML for dynamic content`;

// POST endpoint handler
export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const startTime = Date.now();

  try {
    const body: GenerateRequest = await req.json();
    const { prompt, projectId, generationType = 'webapp', retryAttempt = 0, continuationContext } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('🚀 Starting generation:', {
      projectId,
      promptLength: prompt.length,
      generationType,
      maxTokens: getOptimalTokenLimit(prompt, generationType),
      retryAttempt
    });

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullContent = '';
          let inputTokens = 0;

          // Build enhanced prompt with continuation context if available
          const enhancedPrompt = continuationContext
            ? `${prompt}\n\nCONTINUATION CONTEXT: You previously generated:\n${continuationContext}\n\nPlease complete the generation, focusing on what's missing.`
            : prompt;

          // Create message with streaming using retry logic
          const messageStream = await apiQueue.add(() =>
            createMessageWithRetry(anthropic, {
              model: 'claude-sonnet-4-20250514',
              max_tokens: getOptimalTokenLimit(prompt, generationType),
              messages: [{ role: 'user', content: enhancedPrompt }],
              system: ENTERPRISE_SYSTEM_PROMPT,
              stream: true,
            })
          );

          // Process streaming response
          for await (const event of messageStream) {
            if (event.type === 'message_start') {
              inputTokens = event.message.usage.input_tokens;
              if (process.env.NODE_ENV === 'development') {
                console.log('📝 Input tokens:', inputTokens);
              }
            }

            if (event.type === 'content_block_delta') {
              if (event.delta.type === 'text_delta') {
                const text = event.delta.text;
                fullContent += text;

                // Stream content to client
                const streamEvent: StreamEvent = {
                  type: 'content',
                  text,
                  totalLength: fullContent.length,
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(streamEvent)}\n\n`));
              }
            }

            if (event.type === 'message_delta') {
              if (event.delta.stop_reason && process.env.NODE_ENV === 'development') {
                console.log('⏹️ Stop reason:', event.delta.stop_reason);
              }
            }

            if (event.type === 'message_stop') {
              console.log('✅ Stream complete. Total characters:', fullContent.length);
            }
          }

          // Parse and validate generated code
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 Parsing generated code (' + fullContent.length + ' characters)...');
          }
          const parsed = parseGeneratedCode(fullContent);
          if (process.env.NODE_ENV === 'development') {
            console.log('📦 Parsed result:', {
              hasHtml: parsed.hasHtml,
              hasCss: parsed.hasCss,
              hasJavaScript: parsed.hasJavaScript,
              isComplete: parsed.isComplete,
              htmlLength: parsed.html?.length || 0,
              cssLength: parsed.css?.length || 0,
              jsLength: parsed.javascript?.length || 0,
              jsValid: parsed.jsValid,
              jsError: parsed.jsError
            });
          }

          const generationTime = Date.now() - startTime;

          // Check if JavaScript is valid
          if (parsed.hasJavaScript && !parsed.jsValid) {
            console.error('❌ JavaScript validation failed:', parsed.jsError);
            
            // If this is not already a retry, attempt retry
            if (retryAttempt < 2) {
              const retryEvent: StreamEvent = {
                type: 'retry',
                message: 'JavaScript validation failed, retrying...',
                attempt: retryAttempt + 1,
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(retryEvent)}\n\n`));
            }
          }

          // Analyze code quality
          const quality = parsed.html && parsed.javascript 
            ? analyzeCodeQuality(parsed)
            : { score: 0, issues: [], warnings: [] };

          if (process.env.NODE_ENV === 'development') {
            console.log('📊 Code quality analysis:', {
              score: quality.score,
              issuesCount: quality.issues.length,
              warningsCount: quality.warnings.length
            });
          }

          // Save to database if projectId provided - SAVE EVEN IF INCOMPLETE
          if (projectId && (parsed.hasHtml || parsed.hasCss || parsed.hasJavaScript)) {
            try {
              if (process.env.NODE_ENV === 'development') {
                console.log('💾 Auto-saving project:', projectId);
              }

              // ✅ FIX: Combine HTML, CSS, and JavaScript into a single complete HTML file
              let completeHtml = '';
              
              if (parsed.html) {
                // Already complete HTML (from the AI generation)
                completeHtml = parsed.html;
              } else if (parsed.hasHtml || parsed.hasCss || parsed.hasJavaScript) {
                // Need to combine separate parts into complete HTML
                const cssBlock = parsed.css ? `<style>\n${parsed.css}\n</style>` : '';
                const jsBlock = parsed.javascript ? `<script>\n${parsed.javascript}\n</script>` : '';
                
                completeHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Project</title>
    ${cssBlock}
</head>
<body>
    <!-- Generated Content -->
    ${jsBlock}
</body>
</html>`;
              }

              console.log('📦 Complete HTML length:', completeHtml.length);

              // Analyze code quality (keep existing code)
              const quality = parsed.html && parsed.javascript 
                ? analyzeCodeQuality(parsed)
                : { score: 0, issues: [], warnings: [] };

              if (process.env.NODE_ENV === 'development') {
                console.log('📊 Code quality analysis:', {
                  score: quality.score,
                  issuesCount: quality.issues.length,
                  warningsCount: quality.warnings.length
                });
              }

              // ✅ FIX: Save to ALL THREE fields like ChatBuilder does
              await prisma.project.update({
                where: { id: projectId },
                data: {
                  // ✅ CRITICAL: Save complete HTML to all three fields
                  code: completeHtml,              // ✅ NEW - Preview pages use this
                  html: completeHtml,               // ✅ UPDATED - Complete HTML, not just HTML part
                  htmlCode: completeHtml,           // ✅ NEW - Edit functionality uses this

                  // Also keep the separate parts for reference (optional)
                  css: parsed.css || '',
                  javascript: parsed.javascript || '',

                  // Code structure flags
                  hasHtml: parsed.hasHtml || !!completeHtml,  // ✅ Set to true if we have complete HTML
                  hasCss: parsed.hasCss,
                  hasJavaScript: parsed.hasJavaScript,
                  isComplete: parsed.isComplete,
                  jsValid: parsed.jsValid,
                  jsError: parsed.jsError,

                  // Validation results
                  validationScore: quality.score,
                  validationPassed: quality.score >= 70,
                  validationErrors: quality.issues,
                  validationWarnings: quality.warnings,
                  cspViolations: parsed.html && parsed.javascript 
                    ? checkCSPViolations(parsed.html, parsed.javascript)
                    : [],

                  // Metadata
                  status: parsed.isComplete ? ProjectStatus.COMPLETED : ProjectStatus.GENERATING,
                  tokensUsed: inputTokens,
                  generationTime,
                  retryCount: retryAttempt,
                  lastModified: new Date(),
                },
              });

              if (process.env.NODE_ENV === 'development') {
                console.log('✅ Project auto-saved successfully');
                console.log('📝 Code field length:', completeHtml.length);
              }
            } catch (dbError) {
              if (process.env.NODE_ENV === 'development') {
                console.error('❌ Database save error:', dbError);
              }
              // Don't fail the request if save fails
            }
          }

          // Send completion event
          const completeEvent: StreamEvent = {
            type: 'complete',
            parsed: {
              hasHtml: parsed.hasHtml,
              hasCss: parsed.hasCss,
              hasJavaScript: parsed.hasJavaScript,
              isComplete: parsed.isComplete,
            },
            metadata: {
              tokensUsed: inputTokens,
              generationTime,
              wasTruncated: !parsed.isComplete,
              stopReason: parsed.isComplete ? 'complete' : 'incomplete',
            },
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(completeEvent)}\n\n`));

          console.log('⏱️ Generation completed in ' + generationTime + 'ms');
          controller.close();

        } catch (error) {
          console.error('Stream error:', error);

          // Check if it's an overload error
          let errorMessage = 'An error occurred during generation';
          
          if (error instanceof Error) {
            if (error.message.includes('overloaded') || error.message.includes('Overloaded')) {
              errorMessage = 'Anthropic API is currently experiencing high load. Please try again in a moment.';
            } else {
              errorMessage = error.message;
            }
          }

          const errorEvent: StreamEvent = {
            type: 'error',
            error: errorMessage,
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate code',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}