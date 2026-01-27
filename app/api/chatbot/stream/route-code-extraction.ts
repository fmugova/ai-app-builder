/**
 * DEBUG API ROUTE
 * This version logs EXACTLY what Claude sends so we can see the format
 * Use temporarily to diagnose the extraction issue
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';
import { validateGeneratedCode } from '@/lib/code-validator';
import prisma from '@/lib/prisma';
import * as cheerio from 'cheerio';

// Import robust extractor
import { extractCodeBlocks } from '@/lib/robust-code-extraction';

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

    const { prompt, projectId, max_tokens } = await request.json();

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
          const extracted: { html: string; css: string; js: string } = { html: '', css: '', js: '' };

          const claudeStream = await anthropic.messages.stream({
            model: 'claude-sonnet-4-20250514',
            max_tokens: Math.min(Number(max_tokens) || 50000, 50000), // Always cap at 50000
            messages: [
              {
                role: 'user',
                content: `Generate a complete, production-ready wellness app website.

CRITICAL REQUIREMENTS:
- Your response MUST start with \`\`\`html (lowercase)
- The HTML must be a valid, complete document
- You MUST end with a complete </html> tag and a closing triple backtick (\`\`\`)
- Do NOT add any explanation, comments, or prose before or after the code block
- If you cannot fit the entire document, DO NOT output anything

Format your response like this:

\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <title>Wellness App</title>
  <style>
    /* CSS goes here */
  </style>
</head>
<body>
  <!-- HTML content goes here -->
  <script>
    // JavaScript goes here
  </script>
</body>
</html>
\`\`\`
                `,
              },
            ],
          });

          for await (const event of claudeStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const chunk = event.delta.text;
              accumulatedCode += chunk;

              if (accumulatedCode.length % 1000 < chunk.length) {
                console.log(`Progress: ${accumulatedCode.length} chars`);
              }

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ 
                    type: 'chunk', 
                    content: chunk,
                    progress: accumulatedCode.length
                  })}\n\n`
                )
              );
            }

            if (event.type === 'message_stop') {
              console.log('✅ Stream complete');
              console.log('📊 Total accumulated:', accumulatedCode.length, 'characters');
              
              // ============================================================================
              // DEBUG: Show EXACTLY what Claude sent
              // ============================================================================
              
              console.log('\n=== CLAUDE\'S RESPONSE ===');
              console.log('First 1000 chars:');
              console.log(accumulatedCode.substring(0, 1000));
              console.log('\n...\n');
              console.log('Last 500 chars:');
              console.log(accumulatedCode.substring(accumulatedCode.length - 500));
              console.log('=== END RESPONSE ===\n');
              
              // Check what's in the response
              console.log('🔍 Checking content:');
              console.log('- Contains "```html":', accumulatedCode.includes('```html'));
              console.log('- Contains "```HTML":', accumulatedCode.includes('```HTML'));
              console.log('- Contains "<!DOCTYPE":', accumulatedCode.includes('<!DOCTYPE'));
              console.log('- Contains "<html":', accumulatedCode.includes('<html'));
              console.log('- Contains "```":', accumulatedCode.includes('```'));
              
              // Try extraction
              console.log('\n🔍 Attempting extraction...');
              const extracted = extractCodeBlocks(accumulatedCode);

              // === POST-PROCESSING: Repair HTML with cheerio ===
              function repairHtml(html: string) {
                if (!html) return html;
                try {
                  const $ = cheerio.load(html);
                  return $.html();
                } catch (e) {
                  console.error('cheerio repair failed:', e);
                  return html;
                }
              }
              extracted.html = repairHtml(extracted.html);

              console.log('🔍 Extracted code lengths:', {
                html: extracted.html.length,
                css: extracted.css.length,
                js: extracted.js.length
              });
              
              // If extraction failed, try alternative approaches
              if (!extracted.html && !extracted.css && !extracted.js) {
                console.error('\n❌ EXTRACTION FAILED!');
                console.log('💡 Trying manual extraction...');
                
                // Try to find ANY code between ``` markers
                const allCodeBlocks = accumulatedCode.match(/```[\s\S]*?```/g);
                if (allCodeBlocks) {
                  console.log(`Found ${allCodeBlocks.length} code blocks`);
                  allCodeBlocks.forEach((block, i) => {
                    console.log(`Block ${i + 1} preview:`, block.substring(0, 200));
                  });
                } else {
                  console.log('❌ No code blocks found at all!');
                }
                
                // Send error to client
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ 
                      type: 'error',
                      message: 'Failed to extract code from Claude\'s response. Check server logs for details.',
                      debug: {
                        hasCodeBlocks: accumulatedCode.includes('```'),
                        hasHtml: accumulatedCode.includes('<html'),
                        responseLength: accumulatedCode.length
                      }
                    })}\n\n`
                  )
                );
                controller.close();
                return;
              }
              
              // Validate
              const validation = validateGeneratedCode(extracted);
              console.log('🔍 Validation:', validation.validationPassed ? 'PASSED' : 'FAILED');
              
              if (!validation.validationPassed) {
                // Check for incomplete/truncated HTML
                // Use the correct type for validation.errors elements
                const isTruncated = validation.errors.some(
                  (err) => err.type === 'completeness'
                );
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ 
                      type: 'error',
                      message: isTruncated
                        ? 'The generated HTML was incomplete or truncated. Try reducing your prompt or increasing the token limit.'
                        : 'Code validation failed',
                      errors: validation.errors
                    })}\n\n`
                  )
                );
                controller.close();
                return;
              }
              
              // Success!
              const combinedCode = extracted.html || 
                `<!DOCTYPE html><html><head><style>${extracted.css}</style></head><body>${extracted.html}<script>${extracted.js}</script></body></html>`;
              
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ 
                    type: 'complete',
                    html: extracted.html,
                    css: extracted.css,
                    js: extracted.js,
                    code: combinedCode,
                    validation
                  })}\n\n`
                )
              );

              // Send HTML FIRST
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'html', content: extracted.html })}\n\n`
                )
              );

              // THEN send complete
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'complete', message: 'Success!' })}\n\n`
                )
              );

              controller.close();
            }
          }
        } catch (error) {
          console.error('❌ Error:', error);
          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ 
                  type: 'error',
                  message: (error instanceof Error ? error.message : String(error))
                })}\n\n`
              )
            );
            controller.close();
          } catch (e) {
            // If controller is not available, just log
            console.error('Failed to send SSE error:', e);
          }
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (error) {
    console.error('API error:', error);
    // Fallback: send error as JSON if stream setup fails
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}