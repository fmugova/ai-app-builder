import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// POST /api/teacher/ai/draft-email - Draft an email to parents/students
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      studentName,
      purpose,
      context,
      tone,
      length,
      requestMeeting,
    } = body;

    if (!studentName || !purpose) {
      return NextResponse.json(
        { error: 'Student name and purpose are required' },
        { status: 400 }
      );
    }

    // Tone options: formal, friendly, concerned, encouraging
    const selectedTone = tone || 'professional';
    const selectedLength = length || '150-200';

    // Construct prompt for Claude
    const prompt = `You are an experienced UK secondary school teacher drafting an email to parents.

**Email Details:**
- Student: ${studentName}
- Purpose: ${purpose}
- Context: ${context || 'General update'}
- Tone: ${selectedTone}
- Length: ${selectedLength} words
${requestMeeting ? '- Request: Include a request to schedule a meeting' : ''}

**Requirements:**
- Use professional UK school communication style
- Be clear and specific about the issue/achievement
- Be constructive and solution-focused (if addressing concerns)
- Include specific examples where relevant
- End with clear next steps or call to action
${requestMeeting ? '- Suggest meeting times (e.g., after school or during parents evening)' : ''}
- Sign off appropriately

**Email Structure:**
1. Polite greeting
2. Purpose of email (clear and direct)
3. Specific details/examples
4. Positive note or support offered
5. Next steps/call to action
6. Professional sign-off

Please write a complete, ready-to-send email that maintains a ${selectedTone} tone and is approximately ${selectedLength} words.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const emailContent = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    return NextResponse.json({
      success: true,
      email: emailContent,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    });
  } catch (error: any) {
    console.error('Error drafting email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to draft email' },
      { status: 500 }
    );
  }
}
