import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import Anthropic from "@anthropic-ai/sdk"
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, rateLimits } from '@/lib/rateLimit'
import { getAnalyticsScript } from '@/lib/analytics-script'
import { ENHANCED_GENERATION_SYSTEM_PROMPT } from '@/lib/enhanced-system-prompt'

export const dynamic = 'force-dynamic'

// Detect if authentication is needed
function needsAuthentication(prompt: string): boolean {
  const authKeywords = [
    'login', 'signup', 'sign up', 'sign in', 'authentication', 'auth',
    'user accounts', 'register', 'registration', 'protected', 'private', 
    'members only', 'dashboard', 'profile', 'saas', 'admin', 'booking',
    'social network', 'user management', 'customer portal', 'subscription',
    'member site', 'e-learning', 'marketplace', 'community', 'forum'
  ]
  
  const lowerPrompt = prompt.toLowerCase()
  return authKeywords.some(keyword => lowerPrompt.includes(keyword))
}

// Select auth provider based on prompt
function selectAuthProvider(prompt: string): 'nextauth' | 'supabase' | 'jwt' {
  const lowerPrompt = prompt.toLowerCase()
  if (lowerPrompt.includes('supabase') && !lowerPrompt.includes('nextauth')) return 'supabase'
  if (lowerPrompt.includes('jwt') || lowerPrompt.includes('custom auth')) return 'jwt'
  return 'nextauth' // Default - most popular and flexible
}

async function callClaudeWithRetry(anthropic: Anthropic, messages: Anthropic.MessageParam[], maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16000,
        messages: messages
      });
      return response;
    } catch (error: unknown) {
      const errorObj = error as { error?: { type?: string } }
      const isOverloaded = errorObj?.error?.type === 'overloaded_error';
      const isLastAttempt = attempt === maxRetries - 1;

      if (isOverloaded && !isLastAttempt) {
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

// Helper to inject analytics script
function injectAnalytics(code: string, projectId: string): string {
  const analyticsScript = getAnalyticsScript(projectId)
  
  // Find the LAST </script> tag, then inject before the </body> that comes AFTER it
  const lastScriptClose = code.lastIndexOf('</script>')
  
  if (lastScriptClose === -1) {
    // No scripts at all - just inject before </body>
    const bodyClose = code.lastIndexOf('</body>')
    if (bodyClose === -1) return code + '\n' + analyticsScript
    return code.substring(0, bodyClose) + '\n' + analyticsScript + '\n' + code.substring(bodyClose)
  }
  
  // Find the </body> that comes AFTER the last </script>
  const actualBodyClose = code.indexOf('</body>', lastScriptClose)
  
  if (actualBodyClose === -1) {
    // No </body> after scripts - append at end
    console.warn('⚠️ No </body> after scripts, appending at end')
    return code + '\n' + analyticsScript
  }
  
  // Inject before the ACTUAL </body> tag
  console.log('✅ Injecting analytics at position:', actualBodyClose)
  return (
    code.substring(0, actualBodyClose) +
    '\n' + analyticsScript + '\n' +
    code.substring(actualBodyClose)
  )
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const rateLimitResult = checkRateLimit(`ai:${session.user.email}`, rateLimits.aiGeneration)
    if (!rateLimitResult.allowed) {
      const resetIn = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      return NextResponse.json(
        { error: `Rate limit exceeded. Please try again in ${resetIn} seconds.` },
        { status: 429 }
      )
    }

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

    const { prompt, type, projectId } = await request.json()

    // Detect authentication requirement
    const requiresAuth = needsAuthentication(prompt)
    const authProvider = requiresAuth ? selectAuthProvider(prompt) : null

    // Get user's database connection if they have one
    let databaseConfig = null
    if (projectId) {
      const dbConnection = await prisma.databaseConnection.findFirst({
        where: {
          OR: [
            { projectId: projectId },
            { userId: user.id }
          ]
        },
        orderBy: { createdAt: 'desc' }
      })
      
      if (dbConnection) {
        databaseConfig = {
          url: dbConnection.supabaseUrl,
          anonKey: dbConnection.supabaseAnonKey
        }
      }
    }

    // Add to enhanced prompt
    let finalPrompt = ENHANCED_GENERATION_SYSTEM_PROMPT + '\n\n'

    if (databaseConfig) {
      finalPrompt += `\nIMPORTANT: User has a connected Supabase database. Use these credentials:\n\nconst SUPABASE_URL = '${databaseConfig.url}';\nconst SUPABASE_ANON_KEY = '${databaseConfig.anonKey}';\n\nDO NOT ask user to enter credentials. The app should work immediately.\n`
    }

    if (requiresAuth && authProvider) {
      finalPrompt += `\n\nThis application requires user authentication! Include:\n- Login/Signup pages with beautiful UI\n- Protected routes\n- Session management\nMake authentication seamless and production-ready!\n`
    }

    finalPrompt += `Generate a complete, production-ready single-file HTML application for: "${prompt}"\n\nMake it visually stunning, fully functional, and ready to deploy immediately.`

    const message = await callClaudeWithRetry(anthropic, [
      { role: 'user', content: finalPrompt }
    ]);

    let code = '';
    if (message.content && message.content[0]) {
      const content = message.content[0];
      code = content.type === 'text' ? content.text : '';
    } else {
      console.error('Invalid AI response structure:', message)
      return NextResponse.json({ error: 'Invalid AI response' }, { status: 500 });
    }

    // Clean up code blocks
    code = code
      .replace(/```html\n?/g, '')
      .replace(/```jsx\n?/g, '')
      .replace(/```typescript\n?/g, '')
      .replace(/```javascript\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    // Ensure DOCTYPE
    if (!code.startsWith('<!DOCTYPE')) {
      code = `<!DOCTYPE html>\n${code}`
    }

    // Inject analytics with placeholder
    const codeWithAnalytics = injectAnalytics(code, 'SITE_ID_PLACEHOLDER')

    let project;
    let finalCode: string;
    
    if (projectId) {
      // ✅ UPDATE existing project - PREVENTS DUPLICATES!
      const existingProject = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: user.id
        }
      })
      
      if (!existingProject) {
        return NextResponse.json(
          { error: 'Project not found or unauthorized' },
          { status: 404 }
        )
      }
      
      console.log('🔄 Updating existing project:', projectId)
      
      // Replace placeholder with actual project ID
      finalCode = codeWithAnalytics.replace(/SITE_ID_PLACEHOLDER/g, projectId)
      
      project = await prisma.project.update({
        where: { id: projectId },
        data: {
          code: finalCode,
          description: requiresAuth 
            ? `Auth-enabled (${authProvider}): ${new Date().toLocaleDateString()}`
            : `Regenerated: ${new Date().toLocaleDateString()}`,
          updatedAt: new Date()
        }
      })
    } else {
      // ✅ CREATE new project
      console.log('✨ Creating new project')
      
      const projectData = {
        userId: user.id,
        name: prompt.substring(0, 100) || 'Generated Project',
        description: requiresAuth 
          ? `Auth-enabled (${authProvider}): ${new Date().toLocaleDateString()}`
          : `Generated: ${new Date().toLocaleDateString()}`,
        code: codeWithAnalytics,
        type: type || 'landing-page',
        publishedAt: null
      }
      
      project = await prisma.project.create({ data: projectData })

      // Replace placeholder with actual project ID
      finalCode = codeWithAnalytics.replace(/SITE_ID_PLACEHOLDER/g, project.id)

      // Update project with actual code
      await prisma.project.update({
        where: { id: project.id },
        data: { code: finalCode }
      })
    }

    // Update user stats
    await prisma.user.update({
      where: { id: user.id },
      data: { generationsUsed: { increment: 1 } },
    })

    // Check and send usage alerts (non-blocking)
    import('@/lib/usage-alerts').then(({ checkUsageAlerts }) => {
      checkUsageAlerts(user.id).catch(err => 
        console.error('Usage alert check failed:', err)
      )
    })

    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'generation',
        action: projectId ? 'regenerated' : 'generated',
        metadata: {
          promptPreview: prompt.substring(0, 100),
          generationType: type || 'landing-page',
          projectId: project.id
        }
      }
    })

    console.log('✅ Generation successful:', projectId ? 'Updated' : 'Created', project.id)
    
    return NextResponse.json({ 
      code: finalCode,
      projectId: project.id,
      requiresAuth,
      authProvider,
      message: requiresAuth 
        ? `Authentication system included using ${authProvider}. Users can log in and access protected content.`
        : undefined
    })

  } catch (error: unknown) {
    console.error('Generate error:', error)
    const errorObj = error as { message?: string; error?: { type?: string }; status?: number; stack?: string }
    console.error('Error details:', {
      message: errorObj.message,
      type: errorObj?.error?.type,
      status: errorObj?.status,
      stack: errorObj.stack
    })

    if (errorObj?.error?.type === 'overloaded_error') {
      return NextResponse.json(
        { error: 'Claude is experiencing high demand. Please try again in a moment.', retryable: true },
        { status: 503 }
      );
    }

    if (errorObj?.status === 401) {
      return NextResponse.json(
        { error: 'AI service configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate code', details: errorObj.message || 'Unknown error' },
      { status: 500 }
    );
  }
}