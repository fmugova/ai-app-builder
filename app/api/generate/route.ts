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
        max_tokens: 16000,
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


    const systemPrompt = `You are an expert React developer. Generate COMPLETE, PRODUCTION-READY code.

ABSOLUTE REQUIREMENTS - CODE MUST BE 100% COMPLETE:
1. NEVER truncate or cut off code - generate the ENTIRE page from start to finish
2. ALL JSX must be syntactically valid and complete
3. ALL .map() functions MUST have closing parentheses: .map(() => (...))
4. ALL opening tags MUST have closing tags: <div>...</div>
5. ALWAYS close all braces, brackets, and parentheses
6. Code MUST end with proper closing tags: </body></html>
7. If you start generating content, you MUST finish it completely
8. NO placeholder comments like "...rest of code..." or "...more content..."

SYNTAX VALIDATION CHECKLIST (verify before responding):
✓ Every opening brace { has a closing }
✓ Every opening bracket [ has a closing ]
✓ Every opening parenthesis ( has a closing )
✓ Every <tag> has a </tag>
✓ All .map() calls are complete
✓ Footer section is included
✓ Code ends with </body></html>

CRITICAL REQUIREMENTS:
1. MUST include a complete professional footer section at the bottom (before closing </body> tag)
2. Footer MUST contain:
   - Company name and description
   - Grid layout with multiple columns (Product, Company, Legal sections)
   - Copyright notice with current year
   - Social media links (Twitter, GitHub, LinkedIn)
   - Navigation links (Features, Pricing, About, Contact, Privacy Policy, Terms)
   - Dark background (bg-gray-900) with white text
   - Responsive grid (grid-cols-1 md:grid-cols-4)
   - Proper spacing and styling

REQUIRED Footer Template (customize text based on project):
<footer class="bg-gray-900 text-white py-12 mt-20">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
      <div>
        <h3 class="text-white font-bold text-lg mb-4">[Project Name]</h3>
        <p class="text-gray-400 text-sm">
          [Brief description based on project purpose]
        </p>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-4">Product</h4>
        <ul class="space-y-2">
          <li><a href="#features" class="text-gray-400 hover:text-white text-sm transition">Features</a></li>
          <li><a href="#pricing" class="text-gray-400 hover:text-white text-sm transition">Pricing</a></li>
          <li><a href="#templates" class="text-gray-400 hover:text-white text-sm transition">Templates</a></li>
          <li><a href="#docs" class="text-gray-400 hover:text-white text-sm transition">Documentation</a></li>
        </ul>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-4">Company</h4>
        <ul class="space-y-2">
          <li><a href="#about" class="text-gray-400 hover:text-white text-sm transition">About Us</a></li>
          <li><a href="#contact" class="text-gray-400 hover:text-white text-sm transition">Contact</a></li>
          <li><a href="#careers" class="text-gray-400 hover:text-white text-sm transition">Careers</a></li>
          <li><a href="#blog" class="text-gray-400 hover:text-white text-sm transition">Blog</a></li>
        </ul>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-4">Legal</h4>
        <ul class="space-y-2">
          <li><a href="#privacy" class="text-gray-400 hover:text-white text-sm transition">Privacy Policy</a></li>
          <li><a href="#terms" class="text-gray-400 hover:text-white text-sm transition">Terms of Service</a></li>
          <li><a href="#cookies" class="text-gray-400 hover:text-white text-sm transition">Cookie Policy</a></li>
        </ul>
      </div>
    </div>
    <div class="border-t border-gray-800 mt-8 pt-8">
      <div class="flex flex-col md:flex-row justify-between items-center">
        <p class="text-gray-400 text-sm">
          © ${new Date().getFullYear()} [Project Name]. All rights reserved.
        </p>
        <div class="flex gap-6 mt-4 md:mt-0">
          <a href="#" class="text-gray-400 hover:text-white transition" aria-label="Twitter">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/></svg>
          </a>
          <a href="#" class="text-gray-400 hover:text-white transition" aria-label="GitHub">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd"/></svg>
          </a>
          <a href="#" class="text-gray-400 hover:text-white transition" aria-label="LinkedIn">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          </a>
        </div>
      </div>
    </div>
  </div>
</footer>

DO NOT FORGET: Every generated page MUST end with the footer section before </body>.

Now generate based on this user request: ${prompt}`

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