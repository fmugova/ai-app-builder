// app/api/generate/route.ts
// ✅ PATCHED VERSION - Adds missing HTML event emission


import { NextRequest, NextResponse } from 'next/server';
import { checkUserRateLimit, createRateLimitResponse } from '@/lib/rate-limit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';
import type { MessageCreateParams } from '@anthropic-ai/sdk/resources/messages';
import type { Stream } from '@anthropic-ai/sdk/streaming';
import { prisma } from '@/lib/prisma';
import { parseGeneratedCode, analyzeCodeQuality, checkCSPViolations } from '@/lib/code-parser';
import { ProjectStatus } from '@prisma/client';
import { apiQueue } from '@/lib/api-queue';
    const encoder = new TextEncoder();
    const startTime = Date.now();

    try {
      // ============================================================================
      // 1. AUTHENTICATION
      // ============================================================================
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // ============================================================================
      // 2. GET USER DATA & VALIDATE SUBSCRIPTION
      // ============================================================================
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          subscriptionTier: true,
          subscriptionStatus: true,
        },
      });

      if (!user || user.subscriptionStatus !== 'active') {
        return NextResponse.json({ error: 'Active subscription required' }, { status: 403 });
      }

      // ============================================================================
      // 3. 🔴 RATE LIMIT CHECK
      // ============================================================================
      const rateLimit = await checkUserRateLimit(
        req,
        user.id,
        user.subscriptionTier,
        user.subscriptionStatus
      );

      if (!rateLimit.success) {
        return createRateLimitResponse(rateLimit, user.subscriptionTier);
      }

      // ...existing code...
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

      // ...existing code...
      const stream = new ReadableStream({
        async start(controller) {
          try {
            let fullContent = '';
            let inputTokens = 0;

            // ...existing code...
            const enhancedPrompt = continuationContext
              ? `${prompt}\n\nCONTINUATION CONTEXT: You previously generated:\n${continuationContext}\n\nPlease complete the generation, focusing on what's missing.`
              : prompt;

            // ...existing code...
            const messageStream = await apiQueue.add(() =>
              createMessageWithRetry(anthropic, {
                model: 'claude-sonnet-4-20250514',
                max_tokens: getOptimalTokenLimit(prompt, generationType),
                messages: [{ role: 'user', content: enhancedPrompt }],
                system: ENTERPRISE_SYSTEM_PROMPT,
                stream: true,
              })
            );

            // ...existing code...
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

            // ...existing code...
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

            // ...existing code...
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

            // ...existing code...
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

            // ...existing code...
            let completeHtml = '';
          
            if (parsed.html) {
              // Already complete HTML (from the AI generation)
              completeHtml = parsed.html;
            } else if (parsed.hasHtml || parsed.hasCss || parsed.hasJavaScript) {
              // Need to combine separate parts into complete HTML
              const cssBlock = parsed.css ? `<style>\n${parsed.css}\n</style>` : '';
              const jsBlock = parsed.javascript ? `<script>\n${parsed.javascript}\n</script>` : '';
            
              completeHtml = `<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>Generated Project</title>\n    ${cssBlock}\n</head>\n<body>\n    <!-- Generated Content -->\n    ${jsBlock}\n</body>\n</html>`;
            }

            // ...existing code...
            if (completeHtml) {
              const htmlEvent: StreamEvent = {
                type: 'html',
                content: completeHtml,
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(htmlEvent)}\n\n`));
              console.log('📤 Sent HTML event to client:', completeHtml.length, 'chars');
            }

            // ...existing code...
            if (projectId && (parsed.hasHtml || parsed.hasCss || parsed.hasJavaScript)) {
              try {
                if (process.env.NODE_ENV === 'development') {
                  console.log('💾 Auto-saving project:', projectId);
                  console.log('📦 Complete HTML length:', completeHtml.length);
                }

                // ...existing code...
                await prisma.project.update({
                  where: { id: projectId },
                  data: {
                    // ...existing code...
                    code: completeHtml,              // ✅ Preview pages use this
                    html: completeHtml,               // ✅ Complete HTML, not just HTML part
                    htmlCode: completeHtml,           // ✅ Edit functionality uses this

                    // ...existing code...
                    css: parsed.css || '',
                    javascript: parsed.javascript || '',

                    // ...existing code...
                    hasHtml: parsed.hasHtml || !!completeHtml,  // ✅ Set to true if we have complete HTML
                    hasCss: parsed.hasCss,
                    hasJavaScript: parsed.hasJavaScript,
                    isComplete: parsed.isComplete,
                    jsValid: parsed.jsValid,
                    jsError: parsed.jsError,

                    // ...existing code...
                    validationScore: quality.score,
                    validationPassed: quality.score >= 70,
                    validationErrors: quality.issues,
                    validationWarnings: quality.warnings,
                    cspViolations: parsed.html && parsed.javascript 
                      ? checkCSPViolations(parsed.html, parsed.javascript)
                      : [],

                    // ...existing code...
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

            // ...existing code...
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
               
               addTodo() {
                   const input = document.getElementById('todoInput');
                   if (!input || !input.value.trim()) return;
                   
                   this.todos.push({
                       id: Date.now(),
                       text: input.value.trim(),
                       completed: false
                   });
                   
                   input.value = '';
                   this.saveTodos();
                   this.render();
               },
               
               loadTodos() {
                   try {
                       const saved = localStorage.getItem('todos');
                       if (saved) this.todos = JSON.parse(saved);
                   } catch (e) {
                       console.error('Failed to load todos:', e);
                   }
               },
               
               saveTodos() {
                   try {
                       localStorage.setItem('todos', JSON.stringify(this.todos));
                   } catch (e) {
                       console.error('Failed to save todos:', e);
                   }
               },
               
               render() {
                   const list = document.getElementById('todoList');
                   if (!list) return;
                   
                   list.innerHTML = this.todos.map(todo => \`
                       <div class="todo-item">
                           \${this.escapeHtml(todo.text)}
                       </div>
                   \`).join('');
               },
               
               escapeHtml(text) {
                   const div = document.createElement('div');
                   div.textContent = text;
                   return div.innerHTML;
               }
           };
           
           todoApp.init();
       });
       </script>
   </body>
   </html>
   \`\`\`

REMEMBER:
- ONE file with EVERYTHING inside
- NO external references
- ALL code wrapped in DOMContentLoaded
- ALWAYS check elements exist
- Use proper error handling
- Complete and valid HTML/CSS/JS`;

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

          // ✅ NEW: Send the parsed HTML to the client IMMEDIATELY
          // This is what Builder.tsx expects!
          if (completeHtml) {
            const htmlEvent: StreamEvent = {
              type: 'html',
              content: completeHtml,
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(htmlEvent)}\n\n`));
            console.log('📤 Sent HTML event to client:', completeHtml.length, 'chars');
          }

          // Save to database if projectId provided - SAVE EVEN IF INCOMPLETE
          if (projectId && (parsed.hasHtml || parsed.hasCss || parsed.hasJavaScript)) {
            try {
              if (process.env.NODE_ENV === 'development') {
                console.log('💾 Auto-saving project:', projectId);
                console.log('📦 Complete HTML length:', completeHtml.length);
              }

              // ✅ Save to ALL THREE fields like ChatBuilder does
              await prisma.project.update({
                where: { id: projectId },
                data: {
                  // ✅ CRITICAL: Save complete HTML to all three fields
                  code: completeHtml,              // ✅ Preview pages use this
                  html: completeHtml,               // ✅ Complete HTML, not just HTML part
                  htmlCode: completeHtml,           // ✅ Edit functionality uses this

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
