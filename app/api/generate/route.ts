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


    // Stronger system prompt to enforce footer generation
    const systemPrompt = `You are an expert web developer. Generate COMPLETE, PRODUCTION-READY HTML code based on the user's request.

**CRITICAL REQUIREMENTS - YOU MUST FOLLOW ALL OF THESE:**

1. **Footer is MANDATORY - NO EXCEPTIONS:**
   - EVERY generated page MUST end with a complete footer
   - Place footer INSIDE the closing </body> tag
   - Use the exact template provided below
   - DO NOT skip or modify the footer structure

2. **FOOTER TEMPLATE (Copy this exactly):**
\`\`\`html
<footer class="bg-gray-900 text-white py-12 mt-16">
  <div class="max-w-7xl mx-auto px-6">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
      <div>
        <h3 class="font-bold text-xl mb-4">BuildFlow</h3>
        <p class="text-gray-400 text-sm">Build amazing apps with AI</p>
      </div>
      <div>
        <h4 class="font-semibold mb-4">Product</h4>
        <ul class="space-y-2 text-sm text-gray-400">
          <li><a href="#" class="hover:text-white transition">Features</a></li>
          <li><a href="#" class="hover:text-white transition">Pricing</a></li>
          <li><a href="#" class="hover:text-white transition">Templates</a></li>
        </ul>
      </div>
      <div>
        <h4 class="font-semibold mb-4">Company</h4>
        <ul class="space-y-2 text-sm text-gray-400">
          <li><a href="#" class="hover:text-white transition">About</a></li>
          <li><a href="#" class="hover:text-white transition">Contact</a></li>
        </ul>
      </div>
      <div>
        <h4 class="font-semibold mb-4">Legal</h4>
        <ul class="space-y-2 text-sm text-gray-400">
          <li><a href="#" class="hover:text-white transition">Terms</a></li>
          <li><a href="#" class="hover:text-white transition">Privacy</a></li>
        </ul>
      </div>
    </div>
    <div class="border-t border-gray-800 pt-8">
      <div class="flex flex-col md:flex-row justify-between items-center gap-4">
        <p class="text-sm text-gray-400">© 2024 BuildFlow. All rights reserved.</p>
        <div class="flex gap-6 text-sm">
          <a href="https://twitter.com/buildflow" class="text-gray-400 hover:text-white transition">Twitter</a>
          <a href="https://github.com/buildflow" class="text-gray-400 hover:text-white transition">GitHub</a>
          <a href="mailto:hello@buildflow.ai" class="text-gray-400 hover:text-white transition">Email</a>
        </div>
      </div>
    </div>
  </div>
</footer>
\`\`\`

3. **HTML Structure (Required order):**
   <!DOCTYPE html>
   <html>
   <head>
     - Tailwind CDN: <script src="https://cdn.tailwindcss.com"></script>
     - Meta viewport tag
     - Title
   </head>
   <body class="min-h-screen flex flex-col">
     - Main content here
     - Footer (mandatory - use template above)
   </body>
   </html>

4. **Design Requirements:**
   - Modern, professional design
   - Mobile-first responsive
   - Smooth transitions and hover effects

**Project Type:** ${type}

**User Request:**
${prompt}

**IMPORTANT:** Generate ONLY pure HTML code. Start with <!DOCTYPE html> and end with </html>. Include the complete footer template above. No markdown, no explanations.`

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