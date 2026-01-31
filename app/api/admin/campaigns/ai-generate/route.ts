export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdminAsync } from '@/lib/admin'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await isAdminAsync()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { prompt, tone, length } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Word count targets
    const wordCounts: Record<string, string> = {
      short: '100-150',
      medium: '200-250',
      long: '350-400'
    }

    // Tone descriptions
    const toneDescriptions: Record<string, string> = {
      professional: 'professional, authoritative, and polished',
      friendly: 'warm, friendly, and conversational',
      exciting: 'energetic, exciting, and enthusiastic',
      educational: 'clear, informative, and educational'
    }

    // Call Claude API
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `You are an expert email marketing copywriter. Create a compelling email newsletter based on this request:

**Topic:** ${prompt}

**Tone:** ${toneDescriptions[tone] || 'professional'}

**Length:** ${wordCounts[length] || '200-250'} words

Generate:
1. A compelling subject line (under 60 characters)
2. Email body in HTML format

Requirements:
- Use engaging, benefit-focused language
- Include a clear call-to-action
- Format with proper HTML (headings, paragraphs, bullet points)
- Make it scannable and easy to read
- Focus on value for the reader

Respond in this exact JSON format:
{
  "subject": "Your subject line here",
  "body": "<h2>Heading</h2><p>Body content...</p>"
}

Only respond with valid JSON, nothing else.`
        }]
      })
    })

    if (!claudeRes.ok) {
      console.error('Claude API error:', await claudeRes.text())
      return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
    }

    const claudeData = await claudeRes.json()
    const content = claudeData.content[0].text


    // Parse JSON response from Claude
    let emailContent
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim()
      emailContent = JSON.parse(cleanContent)
      // ADD THIS LOGGING
      console.log('📧 Generated email content:')
      console.log('Subject:', emailContent.subject)
      console.log('Body length:', emailContent.body?.length)
      console.log('Body preview:', emailContent.body?.substring(0, 200))
    } catch (error) {
      console.error('Failed to parse Claude response:', content)
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    return NextResponse.json({
      subject: emailContent.subject,
      body: emailContent.body
    })

  } catch (error) {
    console.error('AI generation error:', error)
    const Sentry = (await import('@/lib/sentry')).default
    Sentry.captureException(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
