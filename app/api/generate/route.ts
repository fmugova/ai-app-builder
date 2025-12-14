// Retry logic for Claude API with exponential backoff
async function callClaudeWithRetry(messages: any[], maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // anthropic is imported at the top
      // @ts-ignore
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
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, rateLimits } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Enhanced system prompt with footer requirement
    const systemPrompt = `You are an expert web developer. Generate COMPLETE, PRODUCTION-READY HTML code based on the user's request.

**CRITICAL REQUIREMENTS:**

1. **Always include a professional footer** at the bottom with:
   - Company branding (use "BuildFlow" or user's specified name)
   - Copyright notice with current year (© 2024)
   - Footer links: About, Contact, Terms, Privacy
   - Social media icons/links (Twitter, GitHub, LinkedIn)
   - Email contact: hello@buildflow.ai or mailto link

2. **HTML Structure:**
   - Complete <!DOCTYPE html> document
   - Responsive meta viewport tag
   - Tailwind CSS CDN: <script src="https://cdn.tailwindcss.com"></script>
   - Clean, semantic HTML5

3. **Design Quality:**
   - Modern, professional design
   - Mobile-first responsive
   - Proper spacing and typography
   - Consistent color scheme
   - Smooth transitions and hover effects

4. **Footer Template** (always include at minimum):
\`\`\`html
<footer class="bg-gray-900 text-white py-12 mt-auto">
  <div class="max-w-7xl mx-auto px-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
      <div>
        <h3 class="font-bold text-lg mb-4">BuildFlow</h3>
        <p class="text-gray-400 text-sm">Build amazing apps with AI</p>
      </div>
      <div>
        <h4 class="font-semibold mb-4">Links</h4>
        <ul class="space-y-2 text-sm">
          <li><a href="/about" class="text-gray-400 hover:text-white transition">About</a></li>
          <li><a href="/contact" class="text-gray-400 hover:text-white transition">Contact</a></li>
        </ul>
      </div>
      <div>
        <h4 class="font-semibold mb-4">Legal</h4>
        <ul class="space-y-2 text-sm">
          <li><a href="/terms" class="text-gray-400 hover:text-white transition">Terms</a></li>
          <li><a href="/privacy" class="text-gray-400 hover:text-white transition">Privacy</a></li>
        </ul>
      </div>
    </div>
    <div class="border-t border-gray-800 pt-8">
      <div class="flex flex-col md:flex-row justify-between items-center gap-4">
        <p class="text-sm text-gray-400">© 2024 BuildFlow. Built with AI.</p>
        <div class="flex gap-4">
          <a href="https://twitter.com/buildflow" target="_blank" class="text-gray-400 hover:text-white transition">𝕏</a>
          <a href="https://github.com/buildflow" target="_blank" class="text-gray-400 hover:text-white transition">GitHub</a>
          <a href="mailto:hello@buildflow.ai" class="text-gray-400 hover:text-white transition">Email</a>
        </div>
      </div>
    </div>
  </div>
</footer>
\`\`\`

**Project Type:** ${type}
This is a ${type} project. Design accordingly but ALWAYS include the footer.

**User Request:**
${prompt}

Generate ONLY the complete HTML code. No explanations, no markdown code blocks, just pure HTML starting with <!DOCTYPE html>.`

    // Call Claude API with retry logic
    const message = await callClaudeWithRetry([
      {
        role: 'user',
        content: systemPrompt
      }
    ]);

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

    return NextResponse.json({ code })
    
  } catch (error: any) {
    console.error('Generate error:', error)
    if (error?.error?.type === 'overloaded_error') {
      return NextResponse.json(
        {
          error: 'Claude is experiencing high demand. Please try again in a moment.',
          retryable: true
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to generate code' },
      { status: 500 }
    );
  }
}