import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { prompt, type } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.generationsUsed >= user.generationsLimit) {
      return NextResponse.json(
        { 
          error: `Generation limit reached. You've used ${user.generationsUsed}/${user.generationsLimit} generations this month.` 
        },
        { status: 429 }
      )
    }

    // 🔥 NUCLEAR OPTION - ULTRA-STRICT SYSTEM PROMPT
    const systemPrompt = `You are a web developer creating STANDALONE, ISOLATED web pages for a client.

🚫🚫🚫 ABSOLUTELY FORBIDDEN - CRITICAL VIOLATIONS:
❌ The word "Dashboard" anywhere in the code
❌ The word "Builder" anywhere in the code  
❌ Any link containing "/dashboard"
❌ Any link containing "/builder"
❌ Any link containing "/auth"
❌ Any link containing "/api"
❌ Any "Back to Dashboard" text or buttons
❌ Any "Go to Dashboard" text or buttons
❌ router.push() or router.replace() function calls
❌ window.location changes to internal pages
❌ Next.js imports (useRouter, Link, etc.)
❌ React imports or JSX syntax

✅✅✅ REQUIRED SPECIFICATIONS:
1. Complete standalone HTML5 document
2. Must start with: <!DOCTYPE html>
3. Tailwind CSS ONLY via CDN: <script src="https://cdn.tailwindcss.com"></script>
4. Pure vanilla JavaScript (getElementById, addEventListener, etc.)
5. Beautiful, modern, professional SaaS-style design
6. Fully responsive and mobile-first
7. Self-contained single file
8. If back navigation needed: <button onclick="window.history.back()">← Back</button>

📋 TECHNICAL STACK ALLOWED:
- HTML5 semantic elements
- Tailwind CSS utility classes
- Vanilla JavaScript (NO frameworks)
- Chart.js for charts: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
- Alpine.js if needed: <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>

🎨 DESIGN REQUIREMENTS:
- Clean, modern interface
- Professional color palette
- Smooth animations and transitions
- Proper spacing and typography
- Interactive elements with hover states
- Loading states where appropriate
- Form validation if applicable

📝 OUTPUT REQUIREMENTS:
- Pure HTML code ONLY
- NO markdown code blocks (no \`\`\`html)
- NO explanations or comments outside the code
- NO "Here's your code" text
- Start directly with <!DOCTYPE html>
- Complete, production-ready document

⚠️ CONTEXT: This page will be displayed in an IFRAME with NO access to any dashboard or builder. It's a COMPLETELY ISOLATED page for end users. DO NOT reference any admin features.

Generate the complete HTML now!`

    const userPrompt = `Create a stunning ${type || 'landing page'}: ${prompt}

Type: ${type || 'landing page'}
Style: Modern SaaS professional

🔒 ABSOLUTE REQUIREMENTS:
- NO "Dashboard" word anywhere
- NO "Builder" word anywhere
- NO internal navigation links
- Standalone, self-contained page
- Beautiful, professional design
- Fully functional and interactive

Start with <!DOCTYPE html> immediately!`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: `${systemPrompt}\n\n${userPrompt}`
        }
      ],
    })

    let generatedCode = message.content[0].type === 'text' 
      ? message.content[0].text 
      : ''

    // 🔥 PHASE 1: Remove markdown code blocks
    generatedCode = generatedCode
      .replace(/```html\n?/gi, '')
      .replace(/```tsx\n?/gi, '')
      .replace(/```jsx\n?/gi, '')
      .replace(/```typescript\n?/gi, '')
      .replace(/```javascript\n?/gi, '')
      .replace(/```\n?/gi, '')
      .trim()

    // 🔥 PHASE 2: NUCLEAR SANITIZATION - Remove dashboard references
    generatedCode = generatedCode
      // Remove dashboard text variations
      .replace(/Back to Dashboard/gi, 'Back')
      .replace(/Go to Dashboard/gi, 'Back')
      .replace(/Return to Dashboard/gi, 'Back')
      .replace(/Dashboard/gi, 'Home')
      .replace(/Builder/gi, 'Editor')
      
      // Remove all dashboard links - multiple patterns
      .replace(/<a\s+[^>]*href=["']\/dashboard["'][^>]*>.*?<\/a>/gi, '')
      .replace(/<a\s+[^>]*href=["']http:\/\/localhost:\d+\/dashboard["'][^>]*>.*?<\/a>/gi, '')
      .replace(/<a\s+[^>]*href=["']https?:\/\/[^"']*\/dashboard["'][^>]*>.*?<\/a>/gi, '')
      
      // Remove builder links
      .replace(/<a\s+[^>]*href=["']\/builder["'][^>]*>.*?<\/a>/gi, '')
      .replace(/<a\s+[^>]*href=["']http:\/\/localhost:\d+\/builder["'][^>]*>.*?<\/a>/gi, '')
      
      // Remove auth and API links
      .replace(/<a\s+[^>]*href=["']\/auth[^"']*["'][^>]*>.*?<\/a>/gi, '')
      .replace(/<a\s+[^>]*href=["']\/api[^"']*["'][^>]*>.*?<\/a>/gi, '')
      
      // Fix remaining href attributes
      .replace(/href=["']\/dashboard["']/gi, 'href="#"')
      .replace(/href=["']\/builder["']/gi, 'href="#"')
      .replace(/href=["']\/auth[^"']*["']/gi, 'href="#"')
      .replace(/href=["']\/api[^"']*["']/gi, 'href="#"')
      
      // Remove onclick handlers with dashboard
      .replace(/onclick=["'][^"']*dashboard[^"']*["']/gi, 'onclick="window.history.back()"')
      .replace(/onclick=["'][^"']*builder[^"']*["']/gi, 'onclick="window.history.back()"')
      .replace(/onclick=["'][^"']*router\.push[^"']*["']/gi, 'onclick="window.history.back()"')
      .replace(/onclick=["'][^"']*window\.location[^"']*dashboard[^"']*["']/gi, 'onclick="window.history.back()"')
      
      // Remove router and Next.js code
      .replace(/import\s+{\s*useRouter\s*}\s+from\s+['"]next\/navigation['"]/gi, '')
      .replace(/import\s+{\s*Link\s*}\s+from\s+['"]next\/link['"]/gi, '')
      .replace(/const\s+router\s*=\s*useRouter\(\)/gi, '')
      .replace(/router\.push\([^)]*\)/gi, '')
      .replace(/router\.replace\([^)]*\)/gi, '')
      
      // Remove window.location redirects to internal pages
      .replace(/window\.location\s*=\s*["'][^"']*\/dashboard[^"']*["']/gi, '')
      .replace(/window\.location\.href\s*=\s*["'][^"']*\/dashboard[^"']*["']/gi, '')
      .replace(/window\.location\s*=\s*["'][^"']*\/builder[^"']*["']/gi, '')
      .replace(/window\.location\.href\s*=\s*["'][^"']*\/builder[^"']*["']/gi, '')

    // 🔥 PHASE 3: Verify it starts with DOCTYPE
    if (!generatedCode.trim().toLowerCase().startsWith('<!doctype')) {
      generatedCode = `<!DOCTYPE html>\n${generatedCode}`
    }

    // Increment usage
    await prisma.user.update({
      where: { id: user.id },
      data: { generationsUsed: { increment: 1 } }
    })

    console.log('✅ Code generated and sanitized:', {
      originalLength: message.content[0].type === 'text' ? message.content[0].text.length : 0,
      sanitizedLength: generatedCode.length,
      removed: (message.content[0].type === 'text' ? message.content[0].text.length : 0) - generatedCode.length,
      hasDashboard: generatedCode.toLowerCase().includes('dashboard'),
      hasBuilder: generatedCode.toLowerCase().includes('builder'),
    })

    return NextResponse.json({
      code: generatedCode,
      remainingGenerations: user.generationsLimit - user.generationsUsed - 1
    })

  } catch (error: any) {
    console.error('Generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate code' },
      { status: 500 }
    )
  }
}