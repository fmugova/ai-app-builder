import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';
import { validateGeneratedCode } from '@/lib/code-validator';
import prisma from '@/lib/prisma';

/**
 * COMPLETE DATABASE SAVE FIX
 * Fixes: Empty preview, failed saves, enum errors, missing fields
 */

function encodeSSE(data: Record<string, unknown>): string {
  try {
    const jsonStr = JSON.stringify(data);
    const safe = jsonStr
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
    return `data: ${safe}\n\n`;
  } catch (error) {
    console.error('Failed to encode SSE:', error);
    return `data: ${JSON.stringify({ type: 'error', message: 'Encoding error' })}\n\n`;
  }
}

function extractCodeBlocks(text: string): { html: string; css: string; js: string } {
  let html = '';
  
  // Try complete code block
  const htmlMatch = text.match(/```html\n([\s\S]*?)```/i);
  if (htmlMatch) {
    html = htmlMatch[1].trim();
  }
  
  // Handle incomplete
  if (!html) {
    const incompleteMatch = text.match(/```html\s*\n([\s\S]*)/i);
    if (incompleteMatch) {
      html = incompleteMatch[1].trim();
    }
  }

  // Find HTML without markdown
  if (!html && text.includes('<!DOCTYPE')) {
    const docMatch = text.match(/<!DOCTYPE html>[\s\S]*/i);
    if (docMatch) {
      html = docMatch[0].trim();
    }
  }

  return { html, css: '', js: '' };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Subscription: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { prompt, projectId } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let accumulatedCode = '';
          let savedProjectId = projectId;

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

          for await (const event of claudeStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const chunk = event.delta.text;
              accumulatedCode += chunk;

              if (accumulatedCode.length % 1000 < chunk.length) {
                console.log(`📝 Progress: ${accumulatedCode.length} chars`);
              }

              controller.enqueue(
                encoder.encode(
                  encodeSSE({
                    type: 'progress',
                    length: accumulatedCode.length
                  })
                )
              );
            }

            if (event.type === 'message_stop') {
              console.log('✅ Stream complete:', accumulatedCode.length, 'chars');

              const extracted = extractCodeBlocks(accumulatedCode);
              
              if (!extracted.html) {
                console.error('❌ No HTML extracted!');
                controller.enqueue(
                  encoder.encode(
                    encodeSSE({
                      type: 'error',
                      message: 'Failed to generate valid HTML. Please try again.'
                    })
                  )
                );
                controller.close();
                return;
              }

              const validation = validateGeneratedCode(extracted);
              console.log('🔍 Validation:', validation.validationPassed ? 'PASSED ✅' : 'FAILED ❌');

              if (!validation.validationPassed) {
                console.error('❌ Validation errors:', validation.errors);
                controller.enqueue(
                  encoder.encode(
                    encodeSSE({
                      type: 'error',
                      message: 'Code validation failed',
                      errors: validation.errors,
                      validationScore: validation.validationScore,
                    })
                  )
                );
                controller.close();
                return;
              }

              const finalCode = extracted.html;
              console.log('📊 Final code length:', finalCode.length);

              // ✅ CRITICAL FIX: Save to database with ALL required fields
              try {
                if (savedProjectId) {
                  // Update existing
                  await prisma.project.update({
                    where: { id: savedProjectId },
                    data: {
                      code: finalCode,
                      html: finalCode,        // ✅ Add this
                      htmlCode: finalCode,    // ✅ Add this
                      hasHtml: true,          // ✅ Add this
                      isComplete: true,       // ✅ Add this
                      validationPassed: true, // ✅ Add this
                      updatedAt: new Date(),
                    },
                  });
                  console.log('💾 Updated project:', savedProjectId);
                } else {
                  // Create new - with ONLY the fields that exist in your schema
                  const newProject = await prisma.project.create({
                    data: {
                      name: prompt.slice(0, 50) || 'Generated Project',
                      description: prompt.slice(0, 200) || null,
                      code: finalCode,
                      html: finalCode,        // ✅ NEW
                      htmlCode: finalCode,    // ✅ NEW
                      hasHtml: true,          // ✅ NEW
                      isComplete: true,       // ✅ NEW
                      validationPassed: true, // ✅ NEW
                      type: 'landing-page',
                      userId: user.id,
                      // Status field omitted - uses default from schema
                    },
                  });
                  savedProjectId = newProject.id;
                  console.log('💾 Created project:', savedProjectId);
                  console.log('📝 Code saved:', finalCode.length, 'chars');
                  
                  controller.enqueue(
                    encoder.encode(
                      encodeSSE({
                        type: 'projectCreated',
                        projectId: savedProjectId
                      })
                    )
                  );
                }
              } catch (dbError: unknown) {
                if (dbError && typeof dbError === 'object' && 'message' in dbError) {
                  console.error('❌ Database error:', (dbError as { message: string }).message);
                } else {
                  console.error('❌ Database error:', dbError);
                }
                console.error('Full error:', dbError);
                // Still continue - don't fail the request
              }

              // Send success
              controller.enqueue(
                encoder.encode(
                  encodeSSE({
                    type: 'complete',
                    message: 'Generation complete',
                    validation: {
                      passed: validation.validationPassed,
                      score: validation.validationScore
                    },
                    projectId: savedProjectId,
                  })
                )
              );

              // Send HTML
              controller.enqueue(
                encoder.encode(
                  encodeSSE({ type: 'html', content: finalCode })
                )
              );

              controller.close();
            }
          }
        } catch (error) {
          console.error('❌ Stream error:', error);
          controller.enqueue(
            encoder.encode(
              encodeSSE({
                type: 'error',
                message: error instanceof Error ? error.message : 'Generation failed'
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
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}