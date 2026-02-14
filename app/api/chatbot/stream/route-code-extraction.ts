/**
 * DEBUG API ROUTE
 * This version logs EXACTLY what Claude sends so we can see the format
 * Use temporarily to diagnose the extraction issue
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';
import { CodeValidator } from '@/lib/validators';
import { prisma } from '@/lib/prisma';
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

    const { prompt, max_tokens } = await request.json();

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
              // Try extraction
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

              // If extraction failed, try alternative approaches
              if (!extracted.html && !extracted.css && !extracted.js) {
                
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
              
              // Validate the extracted code
              const validator = new CodeValidator();
              const validation = validator.validateAll(extracted.html, extracted.css, extracted.js);
              
              if (!validation.passed) {
                // ✅ FIXED: Check for incomplete/truncated HTML properly
                const isTruncated = 
                  !extracted.html ||
                  extracted.html.trim().length === 0 ||
                  validation.errors.some(err => 
                    err.severity === 'critical' ||
                    (err.category === 'syntax' && 
                     (err.message.includes('empty') || 
                      err.message.includes('Missing DOCTYPE')))
                  );
                
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ 
                      type: 'error',
                      message: isTruncated
                        ? 'The generated HTML was incomplete or truncated. Try reducing your prompt or increasing the token limit.'
                        : 'Code validation failed: ' + validation.errors.map(e => e.message).join(', '),
                      errors: validation.errors,
                      warnings: validation.warnings,
                      score: validation.score
                    })}\n\n`
                  )
                );
                controller.close();
                return;
              }
              
              // Success!
              const combinedCode = extracted.html || 
                `<!DOCTYPE html><html><head><style>${extracted.css}</style></head><body>${extracted.html}<script>${extracted.js}</script></body></html>`;
              
              // Send complete data
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ 
                    type: 'complete',
                    html: extracted.html,
                    css: extracted.css,
                    js: extracted.js,
                    code: combinedCode,
                    validation,
                    score: validation.score
                  })}\n\n`
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