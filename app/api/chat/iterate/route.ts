import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';
import prisma from '@/lib/prisma';

/**
 * FIXED ITERATION ROUTE - Now Saves to Database!
 * 
 * This route handles modifications to existing code
 * and properly saves changes to the database.
 */

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const message = formData.get('message') as string;
    const currentCode = formData.get('currentCode') as string;
    const projectId = formData.get('projectId') as string;
    const conversationHistory = formData.get('conversationHistory') as string;

    if (!message || !currentCode) {
      return NextResponse.json({ error: 'Message and current code are required' }, { status: 400 });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Build conversation context
    let conversationContext = '';
    if (conversationHistory) {
      try {
        const history = JSON.parse(conversationHistory) as Array<{ role: string; content: string }>;
        conversationContext = history
          .map((msg: { role: string; content: string }) => `${msg.role}: ${msg.content}`)
          .join('\n');
      } catch (e) {
        console.warn('Failed to parse conversation history');
      }
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: `You are modifying an existing website. Here's the current code:

${currentCode}

${conversationContext ? `\nPrevious conversation:\n${conversationContext}\n` : ''}

The user wants: ${message}

CRITICAL INSTRUCTIONS:
1. Make ONLY the requested changes
2. Keep all existing functionality intact
3. Return the COMPLETE modified code
4. Include ALL HTML, CSS, and JavaScript
5. Ensure ALL tags are properly closed
6. Make it production-ready

OUTPUT FORMAT:
\`\`\`html
<!DOCTYPE html>
<!-- COMPLETE MODIFIED CODE HERE -->
</html>
\`\`\`

Return the ENTIRE updated code, not just the changes.`,
        },
      ],
    });

    // Extract code from response
    const content = response.content[0];
    let modifiedCode = '';

    if (content.type === 'text') {
      const text = content.text;
      
      // Try to extract HTML from code block
      const htmlMatch = text.match(/```html\n([\s\S]*?)```/i);
      if (htmlMatch) {
        modifiedCode = htmlMatch[1].trim();
      } else {
        // Try without markdown
        const docMatch = text.match(/<!DOCTYPE html>[\s\S]*/i);
        if (docMatch) {
          modifiedCode = docMatch[0].trim();
        }
      }
    }

    if (!modifiedCode) {
      console.error('❌ Failed to extract modified code');
      return NextResponse.json({ 
        error: 'Failed to generate modified code',
        debug: content 
      }, { status: 500 });
    }

    console.log('✅ Code modified successfully:', modifiedCode.length, 'chars');

    // ✅ CRITICAL: Save to database if projectId exists
    if (projectId) {
      try {
        await prisma.project.update({
          where: { id: projectId },
          data: {
            code: modifiedCode,
            updatedAt: new Date(),
          },
        });
        console.log('💾 Saved iteration to database:', projectId);
      } catch (dbError) {
        console.error('❌ Database save failed:', dbError);
        // Don't fail the request, just log it
      }
    } else {
      console.warn('⚠️ No projectId provided - iteration not saved to database');
    }

    return NextResponse.json({
      success: true,
      code: modifiedCode,
      projectId: projectId || null,
    });

  } catch (error: unknown) {
    console.error('Iteration error:', error);
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { 
        error: 'Failed to process iteration',
        message: errorMessage
      },
      { status: 500 }
    );
  }
}