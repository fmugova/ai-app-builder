import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import Anthropic from "@anthropic-ai/sdk" // ✅ Import at the TOP
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, rateLimits } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

// Retry logic for Claude API with exponential backoff
async function callClaudeWithRetry(anthropic: Anthropic, messages: any[], maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: messages
      });
      return response;
    } catch (error: any) {
      const isOverloaded = error?.error?.type === 'overloaded_error';
      const isLastAttempt = attempt === maxRetries - 1;
      
      if (isOverloaded && !isLastAttempt) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt + 1) * 1000;
        console.log(`Claude overloaded, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Initialize Anthropic inside the route handler
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Rate limiting - use user email for AI requests
    const rateLimitResult = checkRateLimit(`ai:${session.user.email}`, rateLimits.aiGeneration)
    if (!rateLimitResult.allowed) {
      const resetIn = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      return NextResponse.json(
        { error: `Rate limit exceeded. Please try again in ${resetIn} seconds.` },
        { status: 429 }
      )
    }

    // Check user limits
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        generationsUsed: true,
        generationsLimit: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const limit = user.generationsLimit || 10
    if ((user.generationsUsed || 0) >= limit) {
      return NextResponse.json(
        { error: 'AI request limit reached. Please upgrade your plan.' },
        { status: 429 }
      )
    }

    const { prompt, type } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }


    const systemPrompt = `You are an expert web developer. Generate production-ready HTML code.

IMPORTANT: Always include a professional footer section with:
- Copyright notice
- Social media links (placeholder hrefs)
- Navigation links (About, Contact, Privacy, Terms)
- Responsive design
- Consistent styling with the rest of the page

Example footer structure:
<footer class="bg-gray-900 text-white py-12">
  <div class="max-w-7xl mx-auto px-4">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
      <div>
        <h3 class="text-white font-bold text-lg mb-4">BuildFlow</h3>
        <p class="text-gray-400 text-sm">
          AI-powered no-code platform for building production-ready web applications
        </p>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-4">Product</h4>
        <ul class="space-y-2">
          <li><a href="#" class="text-gray-400 hover:text-white text-sm">Features</a></li>
          <li><a href="#" class="text-gray-400 hover:text-white text-sm">Pricing</a></li>
          <li><a href="#" class="text-gray-400 hover:text-white text-sm">Templates</a></li>
        </ul>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-4">Company</h4>
        <ul class="space-y-2">
          <li><a href="#" class="text-gray-400 hover:text-white text-sm">About</a></li>
          <li><a href="#" class="text-gray-400 hover:text-white text-sm">Contact</a></li>
        </ul>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-4">Legal</h4>
        <ul class="space-y-2">
          <li><a href="#" class="text-gray-400 hover:text-white text-sm">Privacy Policy</a></li>
          <li><a href="#" class="text-gray-400 hover:text-white text-sm">Terms of Service</a></li>
        </ul>
      </div>
    </div>
    <div class="border-t border-gray-800 mt-8 pt-8 text-center">
      <p class="text-gray-400 text-sm">
        © {new Date().getFullYear()} BuildFlow. All rights reserved.
      </p>
      <div class="flex justify-center gap-4 mt-4">
        <a href="#" class="text-gray-400 hover:text-white text-lg" aria-label="Twitter">Twitter</a>
        <a href="#" class="text-gray-400 hover:text-white text-lg" aria-label="GitHub">GitHub</a>
        <a href="#" class="text-gray-400 hover:text-white text-lg" aria-label="LinkedIn">LinkedIn</a>
      </div>
    </div>
  </div>
</footer>

Generate: ${prompt}`

    console.log('Calling Claude API...');
    
    // Call Claude API with retry logic
    const message = await callClaudeWithRetry(
      anthropic,
      [
        {
          role: 'user',
          content: systemPrompt
        }
      ]
    );

    console.log('Claude API response received');

    // Extract code
    let code = '';
    if (message.content && message.content[0]) {
      const content = message.content[0];
      code = content.type === 'text' ? content.text : '';
    } else {
      console.error('Unexpected Claude response:', message);
      return NextResponse.json({ error: 'Invalid AI response' }, { status: 500 });
    }

    // Clean up markdown code blocks
    code = code
      .replace(/```html\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    // Ensure DOCTYPE
    if (!code.startsWith('<!DOCTYPE')) {
      code = `<!DOCTYPE html>\n${code}`
    }

    console.log('Code generated successfully, updating user stats...');

    // Increment usage
    await prisma.user.update({
      where: { id: user.id },
      data: { generationsUsed: { increment: 1 } },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'generation',
        action: 'generated',
        metadata: {
          promptPreview: prompt.substring(0, 100),
          generationType: type || 'landing-page'
        }
      }
    })

    console.log('Generation completed successfully');

    return NextResponse.json({ code })
    
  } catch (error: any) {
    console.error('Generate error:', error)
    
    // Handle overloaded errors
    if (error?.error?.type === 'overloaded_error') {
      return NextResponse.json(
        {
          error: 'Claude is experiencing high demand. Please try again in a moment.',
          retryable: true
        },
        { status: 503 }
      );
    }
    
    // Handle API key errors
    if (error?.status === 401) {
      console.error('ANTHROPIC_API_KEY is invalid or missing');
      return NextResponse.json(
        { error: 'AI service configuration error. Please contact support.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate code', details: error.message },
      { status: 500 }
    );
  }
}