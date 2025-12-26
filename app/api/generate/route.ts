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


    const systemPrompt = `You are an expert web developer creating production-ready websites.

CRITICAL REQUIREMENTS:

1. NAVIGATION & LINKS:
   - Use anchor links (#section-id) for single-page sites
   - Implement smooth scrolling: add "scroll-behavior: smooth" to html/body
   - All navigation must be FUNCTIONAL, not static href="#"
   - Example: <a href="#features" class="...">Features</a>
   
2. INTERACTIVITY:
   - Add working forms with proper submission handlers
   - Interactive elements must have event handlers
   - Buttons should perform actions, not just look pretty
   - Include hover effects and transitions

3. SECTIONS:
   - Use proper ID attributes for all major sections
   - Example: <section id="features" class="...">
   
4. SMOOTH SCROLLING:
   - Add this CSS to every page:
     html { scroll-behavior: smooth; }

5. MOBILE RESPONSIVE NAVIGATION:
   - Create collapsible mobile menu using React state
   - Use md: breakpoint for responsive visibility
   - Example mobile navigation pattern:
   
   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
   
   <nav className="bg-white shadow-sm">
     <div className="max-w-7xl mx-auto px-4">
       <div className="flex justify-between items-center h-16">
         {/* Logo */}
         <div className="text-xl font-bold">Logo</div>
         
         {/* Desktop Menu */}
         <div className="hidden md:flex space-x-8">
           <a href="#features" className="hover:text-purple-600">Features</a>
           <a href="#pricing" className="hover:text-purple-600">Pricing</a>
           <a href="#contact" className="hover:text-purple-600">Contact</a>
         </div>
         
         {/* Mobile Menu Button */}
         <button 
           onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
           className="md:hidden p-2"
         >
           {mobileMenuOpen ? '✕' : '☰'}
         </button>
       </div>
       
       {/* Mobile Menu */}
       {mobileMenuOpen && (
         <div className="md:hidden py-4 space-y-2 border-t">
           <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 hover:bg-gray-100">Features</a>
           <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 hover:bg-gray-100">Pricing</a>
           <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 hover:bg-gray-100">Contact</a>
         </div>
       )}
     </div>
   </nav>

6. FOOTER (REQUIRED):
   - Every page MUST include this footer:
   <footer style="text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
     <p style="margin: 0;">⚡ Built with <a href="https://buildflow-ai.app" target="_blank" style="color: white; font-weight: 600; text-decoration: underline;">BuildFlow AI</a></p>
   </footer>

STRUCTURE:
<!DOCTYPE html>
<html lang="en" style="scroll-behavior: smooth;">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{Project Title}</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState } = React;
    
    function App() {
      const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
      
      return (
        <>
          <nav>{/* Functional responsive navigation with mobile menu */}</nav>
          
          <section id="hero">{/* Content */}</section>
          <section id="features">{/* Content */}</section>
          <section id="pricing">{/* Content */}</section>
          <section id="contact">{/* Content */}</section>
          
          <footer style="text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <p style="margin: 0;">⚡ Built with <a href="https://buildflow-ai.app" target="_blank" style="color: white; font-weight: 600; text-decoration: underline;">BuildFlow AI</a></p>
          </footer>
        </>
      );
    }
    
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>

NEVER:
- No static href="#" links
- No iframe tags
- No external scripts except whitelisted CDNs
- No missing section IDs
- No footer omitted
- No unresponsive navigation

Generate complete, functional, production-ready code.`;

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