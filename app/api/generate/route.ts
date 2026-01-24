// app/api/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { parseGeneratedCode, validateJavaScript, analyzeCodeQuality, checkCSPViolations } from '@/lib/code-parser';
import { ProjectStatus, Prisma } from '@prisma/client';

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
const ENTERPRISE_SYSTEM_PROMPT = `You are an expert full-stack developer generating production-ready web applications.

🚨 CRITICAL RULES (NEVER VIOLATE):

1. CSP COMPLIANCE:
   ❌ NEVER use inline styles: style="color: red"
   ❌ NEVER use inline handlers: onclick="doSomething()"
   ❌ NEVER use javascript: URLs
   ✅ ALWAYS use external CSS classes
   ✅ ALWAYS use data attributes: data-action="submit"
   ✅ ALWAYS attach events in JavaScript: addEventListener

2. SECURITY:
   ✅ ALWAYS escape user input with escapeHtml() function
   ✅ ALWAYS wrap localStorage in try-catch blocks
   ✅ NEVER use eval(), Function(), or string-based setTimeout
   ✅ ALWAYS validate form inputs before processing

3. ARCHITECTURE:
   ✅ Use class-based architecture (ES6+ classes)
   ✅ Separate concerns: State, UI, Controllers
   ✅ Avoid global variables - encapsulate in classes
   ✅ Use static methods for utility functions

4. ERROR HANDLING:
   ✅ Wrap all localStorage calls in try-catch
   ✅ Add global error handlers: window.addEventListener('error')
   ✅ Show user-friendly error messages via toast notifications
   ✅ Log errors to console for debugging

5. ACCESSIBILITY:
   ✅ Add aria-label to icon buttons
   ✅ Use semantic HTML (main, header, footer, nav)
   ✅ Add role="dialog" to modals
   ✅ Include keyboard navigation support (Escape to close)
   ✅ Add aria-live="polite" to notification areas

6. UI/UX:
   ✅ Use toast notifications instead of alert()
   ✅ Add loading states to async buttons
   ✅ Support reduced motion: @media (prefers-reduced-motion)
   ✅ Add smooth animations and transitions
   ✅ Make it mobile responsive

OUTPUT FORMAT (MANDATORY):
You must provide your code in exactly this format with clear markdown code blocks:

## HTML
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' https://cdnjs.cloudflare.com; font-src 'self' https://cdnjs.cloudflare.com; script-src 'self'; img-src 'self' data:; connect-src 'self';">
    <title>App Title</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <!-- Full HTML content here -->
    <div id="toastContainer" class="toast-container"></div>
    <script src="script.js"></script>
</body>
</html>
\`\`\`

## CSS
\`\`\`css
/* Complete CSS styles - include ALL colors, layouts, animations */
:root {
    --primary: #2563eb;
    --secondary: #fbbf24;
    --accent: #10b981;
    --spacing: 1rem;
    --radius: 8px;
    --shadow: 0 4px 24px rgba(0,0,0,0.08);
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

/* Include all styles with proper organization */
/* Toast notifications */
.toast-container { /* ... */ }
.toast { /* ... */ }

/* Loading states */
.btn-loading { /* ... */ }

/* Utility classes */
.modal-open { overflow: hidden; }

/* Responsive design */
@media (max-width: 768px) { /* ... */ }
@media (prefers-reduced-motion: reduce) { /* ... */ }
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
}

// UI Rendering
class UIRenderer {
    static render() { /* ... */ }
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
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, CONFIG.TOAST_DURATION);
    }
}

// Initialize
const appState = new AppState();

function initializeApp() {
    console.log('App initialized successfully');
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

STYLING REQUIREMENTS:
- Use a cohesive color palette with CSS variables
- Include hover effects, transitions, and animations
- Ensure responsive design for all screen sizes
- Add proper spacing, typography, and visual hierarchy
- Create a visually appealing, modern design

IMPORTANT: 
- Write COMPLETE code in each section
- Do NOT use "..." or placeholders for actual implementation
- Do NOT truncate any code
- If running low on space, prioritize core functionality but ALWAYS complete the current code block
- Never end mid-function, mid-style, or mid-HTML tag
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

          // Create message with streaming
          const messageStream = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: getOptimalTokenLimit(prompt, generationType),
            messages: [
              {
                role: 'user',
                content: enhancedPrompt,
              },
            ],
            system: ENTERPRISE_SYSTEM_PROMPT,
            stream: true,
          });

          // Process streaming response
          for await (const event of messageStream) {
            if (event.type === 'message_start') {
              inputTokens = event.message.usage.input_tokens;
              console.log('📝 Input tokens:', inputTokens);
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
              if (event.delta.stop_reason) {
                console.log('⏹️ Stop reason:', event.delta.stop_reason);
              }
            }

            if (event.type === 'message_stop') {
              console.log('✅ Stream complete. Total tokens:', fullContent.length);
            }
          }

          // Parse and validate generated code
          console.log('🔍 Parsing generated code (' + fullContent.length + ' characters)...');
          const parsed = parseGeneratedCode(fullContent);
          
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
              
              // Note: Client should handle retry by making a new request
            }
          }

          // Analyze code quality
          const quality = parsed.html && parsed.javascript 
            ? analyzeCodeQuality(parsed)
            : { score: 0, issues: [], warnings: [] };

          console.log('📊 Code quality analysis:', {
            score: quality.score,
            issuesCount: quality.issues.length,
            warningsCount: quality.warnings.length
          });

          // Save to database if projectId provided
          if (projectId && parsed.isComplete) {
            try {
              await prisma.project.update({
                where: { id: projectId },
                data: {
                  // Generated code
                  html: parsed.html || '',
                  css: parsed.css || '',
                  javascript: parsed.javascript || '',
                  
                  // Code structure flags
                  hasHtml: parsed.hasHtml,
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
                  status: ProjectStatus.COMPLETED,
                  tokensUsed: inputTokens,
                  generationTime,
                  retryCount: retryAttempt,
                  lastModified: new Date(),
                },
              });
              console.log('💾 Project saved to database with validation results:', projectId);
            } catch (dbError) {
              console.error('Database save error:', dbError);
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
          const errorEvent: StreamEvent = {
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error occurred',
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