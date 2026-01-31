import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';
import { CodeValidator, validateHTMLStructure } from '@/lib/validators';
import prisma from '@/lib/prisma';
import { checkUserRateLimit, createRateLimitResponse } from '@/lib/rate-limit';

/**
 * COMPLETE DATABASE SAVE FIX
 * Fixes: Empty preview, failed saves, enum errors, missing fields
 */

// ============================================================================
// FIX: SSE HTML Parse Error
// ============================================================================

interface SSEData {
  type: string;
  content?: string;
  [key: string]: unknown;
}

function encodeSSE(data: SSEData): string {
  try {
    // ✅ FIX 1: Properly handle large HTML content
    if (data.type === 'html' && data.content) {
      // Check size
      const contentLength = data.content.length;
      if (contentLength > 100000) {
        console.warn('⚠️ Large HTML content:', contentLength, 'chars');
      }
      // Escape special characters for JSON
      const escaped = data.content
        .replace(/\\/g, '\\\\')  // Escape backslashes first
        .replace(/"/g, '\\"')    // Escape quotes
        .replace(/\n/g, '\\n')   // Escape newlines
        .replace(/\r/g, '\\r')   // Escape carriage returns
        .replace(/\t/g, '\\t');  // Escape tabs
      const payload = JSON.stringify({
        type: data.type,
        content: escaped
      });
      return `data: ${payload}\n\n`;
    }
    // ✅ FIX 2: Standard encoding for other types
    const jsonStr = JSON.stringify(data);
    return `data: ${jsonStr}\n\n`;
  } catch (error) {
    console.error('❌ SSE encoding error:', error);
    // Fallback: send error event instead of breaking stream
    return `data: ${JSON.stringify({
      type: 'error',
      message: 'Content too large or contains invalid characters'
    })}\n\n`;
  }
}

// ============================================================================
// ALTERNATIVE SOLUTION: Chunk Large HTML
// ============================================================================

function encodeSSEWithChunking(data: SSEData): string[] {
  const MAX_CHUNK_SIZE = 50000; // 50KB chunks
    try {
      // ============================================================================
      // 1. AUTHENTICATION
      // ============================================================================
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Please sign in to generate websites' },
          { status: 401 }
        );
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
          generationsUsed: true,
          generationsLimit: true,
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // ✅ Check subscription status
      if (user.subscriptionStatus !== 'active') {
        return NextResponse.json(
          {
            error: 'Subscription inactive',
            message: 'Please activate your subscription to generate websites',
            upgradeUrl: '/pricing'
          },
          { status: 403 }
        );
      }

      // ============================================================================
      // 3. 🔴 RATE LIMITING (Critical Protection)
      // ============================================================================
      const rateLimit = await checkUserRateLimit(
        request,
        user.id,
        user.subscriptionTier,
        user.subscriptionStatus
      );

      // ❌ Rate limit exceeded
      if (!rateLimit.success) {
        // Log for monitoring
        console.warn('⚠️ Rate limit hit:', {
          userId: user.id,
          tier: user.subscriptionTier,
          timestamp: new Date().toISOString()
        });

        return createRateLimitResponse(rateLimit, user.subscriptionTier);
      }

      // ✅ Log successful rate limit check
      console.log('✅ Rate limit check passed:', {
        userId: user.id,
        tier: user.subscriptionTier,
        remaining: rateLimit.remaining,
        limit: rateLimit.limit
      });

      // ============================================================================
      // 4. CHECK GENERATION LIMITS (Monthly quota)
      // ============================================================================
      if (user.generationsUsed >= user.generationsLimit) {
        return NextResponse.json(
          {
            error: 'Generation limit reached',
            message: `You've used all ${user.generationsLimit} generations this month. ${
              user.subscriptionTier === 'free' 
                ? 'Upgrade to Pro for more!' 
                : 'Your quota will reset next month.'
            }`,
            used: user.generationsUsed,
            limit: user.generationsLimit,
            upgradeUrl: user.subscriptionTier === 'free' ? '/pricing' : undefined
          },
          { status: 429 }
        );
      }

      // ============================================================================
      // 5. PROCESS REQUEST
      // ============================================================================
      const body = await request.json();
      const { prompt, projectId } = body;

      if (!prompt) {
        return NextResponse.json(
          { error: 'Prompt is required' },
          { status: 400 }
        );
      }

      // ✅ Increment generation counter (do this BEFORE generation to prevent abuse)
      await prisma.user.update({
        where: { id: user.id },
        data: { generationsUsed: { increment: 1 } }
      });

      console.log('🚀 Starting generation:', {
        userId: user.id,
        tier: user.subscriptionTier,
        promptLength: prompt.length,
        generationsUsed: user.generationsUsed + 1,
        generationsLimit: user.generationsLimit
      });

      // ============================================================================
      // 6. STREAM AI GENERATION
      // ============================================================================
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            let accumulatedCode = '';
            let lastProgressUpdate = 0;
            let finalProjectId = projectId;

            const claudeStream = await anthropic.messages.stream({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 16000,
              messages: [
                {
                  role: 'user',
                  content: `Create a complete, production-ready ${prompt}.

  CRITICAL REQUIREMENTS:
  1. Generate a COMPLETE, FULLY FUNCTIONAL website
  2. Include ALL code in ONE HTML file
  3. Embed CSS in <style> tags in <head>
  4. Embed JavaScript in <script> tags before </body>
  5. MUST include ALL closing tags
  6. Make it beautiful, modern, and fully responsive
  7. Include smooth animations and interactions

  OUTPUT FORMAT:
  \`\`\`html
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${prompt}</title>
      <style>
          /* ALL CSS HERE */
      </style>
  </head>
  <body>
      <!-- ALL HTML CONTENT HERE -->
    
      <script>
          // ALL JAVASCRIPT HERE
      </script>
  </body>
  </html>
  \`\`\`

  Remember: COMPLETE the entire website. Include ALL closing tags.`,
                },
              ],
            });

            // ✅ Stream chunks with progress updates
            for await (const event of claudeStream) {
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                const chunk = event.delta.text;
                accumulatedCode += chunk;
              
                // Send progress every 5000 chars
                if (accumulatedCode.length - lastProgressUpdate > 5000) {
                  controller.enqueue(
                    encoder.encode(
                      encodeSSE({
                        type: 'progress',
                        length: accumulatedCode.length,
                      })
                    )
                  );
                  lastProgressUpdate = accumulatedCode.length;
                }
              }
            }

            console.log('✅ Stream complete. Total characters:', accumulatedCode.length);
            console.log('🔍 First 500 chars:', accumulatedCode.substring(0, 500));


            // ✅ Extract HTML from markdown code blocks
            const { html } = extractCodeBlocks(accumulatedCode);
            if (!html) {
              console.error('❌ No HTML found in response');
              controller.enqueue(
                encoder.encode(
                  encodeSSE({
                    type: 'error',
                    message: 'Failed to extract HTML from response',
                  })
                )
              );
              controller.close();
              return;
            }

            console.log('✅ Extracted HTML:', html.length, 'characters');

            // === VALIDATION INTEGRATION ===
            // Quick structure check
            const quickValidation = validateHTMLStructure(html, false);
            if (!quickValidation.isValid) {
              console.warn('⚠️ HTML structure issues:', quickValidation.issues);
              controller.enqueue(
                encoder.encode(
                  encodeSSE({
                    type: 'warning',
                    message: 'Generated code has structural issues',
                    issues: quickValidation.issues
                  })
                )
              );
            }

            // Comprehensive validation
            const validator = new CodeValidator();
            const validationResults = validator.validateAll(html, '', ''); // Pass empty strings for CSS/JS if embedded

            console.log('📊 Validation results:', {
              score: validationResults.score,
              passed: validationResults.passed,
              errors: validationResults.errors.length,
              warnings: validationResults.warnings.length
            });

            // Send validation to client
            controller.enqueue(
              encoder.encode(
                encodeSSE({
                  type: 'validation',
                  validation: {
                    passed: validationResults.passed,
                    score: validationResults.score,
                    summary: validationResults.summary,
                    errors: validationResults.errors,
                    warnings: validationResults.warnings.slice(0, 5) // Limit warnings sent
                  }
                })
              )
            );

            // ✅ Create or update project
            if (!finalProjectId) {
              const newProject = await prisma.project.create({
                data: {
                  name: prompt.slice(0, 100) || 'New Project',
                  description: prompt.slice(0, 200) || '',
                  code: html,
                  html: html,
                  type: 'landing-page',
                  userId: user.id,
                },
              });
              finalProjectId = newProject.id;
              console.log('✅ Created project:', finalProjectId);
            
              controller.enqueue(
                encoder.encode(
                  encodeSSE({
                    type: 'projectCreated',
                    projectId: finalProjectId,
                  })
                )
              );
            } else {
              await prisma.project.update({
                where: { id: finalProjectId },
                data: {
                  code: html,
                  html: html,
                  updatedAt: new Date(),
                },
              });
              console.log('✅ Updated project:', finalProjectId);
            }

            // ✅ FIX: Send HTML with correct event type and field name
            // Use chunking for large HTML
            if (html.length > 50000) {
              console.log('📦 Chunking large HTML...');
              const chunks = encodeSSEWithChunking({ type: 'html', content: html });
              for (const chunk of chunks) {
                controller.enqueue(encoder.encode(chunk));
              }
            } else {
              controller.enqueue(
                encoder.encode(
                  encodeSSE({
                    type: 'html',
                    content: html,  // ✅ Use 'content' not 'code'
                  })
                )
              );
            }

            // ✅ Send completion event
            controller.enqueue(
              encoder.encode(
                encodeSSE({
                  type: 'complete',
                  projectId: finalProjectId,
                  message: 'Generation complete',
                })
              )
            );

            controller.close();
          } catch (error) {
            console.error('❌ Stream error:', error);
            controller.enqueue(
              encoder.encode(
                encodeSSE({
                  type: 'error',
                  message: error instanceof Error ? error.message : 'Generation failed',
                })
              )
            );
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no', // ✅ NEW: Disable nginx buffering
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimit.reset).toISOString(),
        },
      });
    } catch (error) {
      console.error('❌ API error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
            );
          } else {
            await prisma.project.update({
              where: { id: finalProjectId },
              data: {
                code: html,
                html: html,
                updatedAt: new Date(),
              },
            });
            console.log('✅ Updated project:', finalProjectId);
          }

          // ✅ FIX: Send HTML with correct event type and field name
          // Use chunking for large HTML
          if (html.length > 50000) {
            console.log('📦 Chunking large HTML...');
            const chunks = encodeSSEWithChunking({ type: 'html', content: html });
            for (const chunk of chunks) {
              controller.enqueue(encoder.encode(chunk));
            }
          } else {
            controller.enqueue(
              encoder.encode(
                encodeSSE({
                  type: 'html',
                  content: html,  // ✅ Use 'content' not 'code'
                })
              )
            );
          }

          // ✅ Send completion event
          controller.enqueue(
            encoder.encode(
              encodeSSE({
                type: 'complete',
                projectId: finalProjectId,
                message: 'Generation complete',
              })
            )
          );

          controller.close();
        } catch (error) {
          console.error('❌ Stream error:', error);
          controller.enqueue(
            encoder.encode(
              encodeSSE({
                type: 'error',
                message: error instanceof Error ? error.message : 'Generation failed',
              })
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // ✅ NEW: Disable nginx buffering
      },
    });
  } catch (error) {
    console.error('API error:', error);
    const Sentry = (await import('@/lib/sentry')).default;
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
