export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit, rateLimits } from '@/lib/rateLimit'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const message = formData.get('message') as string;
    const files = formData.getAll('files') as File[];
    const urls = JSON.parse(formData.get('urls') as string || '[]') as string[];
    const currentCode = formData.get('currentCode') as string;
    const projectType = formData.get('projectType') as string;

    // Process uploaded files
    let fileContents = '';
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const content = Buffer.from(buffer).toString('utf-8');
      fileContents += `\n\n--- File: ${file.name} ---\n${content}\n`;
    }

    // Fetch content from URLs
    let urlContents = '';
    for (const url of urls) {
      try {
        const response = await fetch(url);
        const html = await response.text();
        // Extract text content (simple version - could be enhanced)
        const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        urlContents += `\n\n--- URL: ${url} ---\n${textContent.substring(0, 5000)}\n`;
      } catch (error) {
        console.error(`Failed to fetch ${url}:`, error);
        urlContents += `\n\n--- URL: ${url} ---\n[Failed to fetch content]\n`;
      }
    }

    // Build enhanced context
    const enhancedContext = `
${fileContents}
${urlContents}

User Message: ${message}

Current Code:
${currentCode}
`;

    // Call Claude API with enhanced context
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `You are an expert web developer. The user has provided files, URLs, or references to other websites.

Context from uploaded files and URLs:
${enhancedContext}

Instructions:
1. Analyze any provided files, URLs, or website references
2. Extract relevant features, design patterns, or functionality
3. Adapt those features to the user's current project (${projectType})
4. Generate complete, working code that incorporates the requested features
5. Maintain the existing code structure while adding new features

Generate ONLY the complete HTML code. No explanations, no markdown, just the code.`
        }]
      })
    });

    if (!claudeRes.ok) {
      const error = await claudeRes.text();
      console.error('Claude API error:', error);
      return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
    }

    const claudeData = await claudeRes.json();
    const generatedCode = claudeData.content[0].text;

    return NextResponse.json({
      code: generatedCode,
      message: 'Code generated successfully'
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
