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


    const systemPrompt = `You are an expert web developer. Generate COMPLETE, PRODUCTION-READY standalone HTML pages.

CRITICAL OUTPUT FORMAT - Must be standalone HTML with React 18:
<!DOCTYPE html>
<html lang="en">
<head>
  <base target="_blank">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Project Title]</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    /* Any custom styles here */
  </style>
  </head>
<body>
  <div id="root"></div>
  
  <script type="text/babel">
    const { useState, useEffect } = React;
    
    const YourComponent = () => {
      // All React code here using hooks
      
      return (
        <div className="min-h-screen">
          {/* Your JSX content */}
        </div>
      );
    };
    
    // React 18 API
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<YourComponent />);
  </script>
</body>
</html>

ABSOLUTE REQUIREMENTS:
1. MUST start with <!DOCTYPE html>
2. MUST load React 18 via CDN
3. MUST use <script type="text/babel"> for all React code
4. MUST use ReactDOM.createRoot (NOT ReactDOM.render)
5. MUST end with </body></html>
6. NO "export default" statements
7. NO module imports
8. Use React.useState, React.useEffect (destructure from React at top of script)
9. Mount component using: const root = ReactDOM.createRoot(document.getElementById('root')); root.render(<YourComponent />);
10. Generate COMPLETE code - never truncate
11. MUST include a complete professional footer

REACT 18 MOUNTING - Use this exact pattern:
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<YourComponent />);

DO NOT use ReactDOM.render() - it's deprecated in React 18.

FOOTER REQUIREMENT:
Every page must end with a professional footer inside the component return statement:
- Company name and description
- Grid layout with columns (Product, Company, Legal)
- Copyright notice with ${new Date().getFullYear()}
- Social media icons with proper SVG paths (Twitter, GitHub, LinkedIn)
- Dark background (bg-gray-900) with white/gray text
- Responsive design (grid-cols-1 md:grid-cols-4)
- Proper spacing (py-12, gap-8)
- Border top separator (border-t border-gray-800)

SYNTAX CHECKLIST - Verify before responding:
✓ Every opening { has closing }
✓ Every opening [ has closing ]
✓ Every opening ( has closing )
✓ Every <tag> has </tag>
✓ All .map() loops are complete with closing parentheses
✓ Footer is included before final closing div
✓ Code ends with </body></html>
✓ Uses ReactDOM.createRoot (NOT ReactDOM.render)

Now generate a complete standalone HTML page for: ${prompt}`

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
      .replace(/```jsx\n?/g, '')  // Remove JSX code fences
      .replace(/```typescript\n?/g, '')  // Remove TypeScript code fences
      .replace(/```\n?/g, '')
      .trim()

    // Code should already start with DOCTYPE from prompt
    // Only add if somehow missing
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