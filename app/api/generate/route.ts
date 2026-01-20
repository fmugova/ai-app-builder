// Check if generated code is complete before validation
function isCodeComplete(code: string): { complete: boolean; reason?: string } {
  if (!code.includes('<!DOCTYPE html>') && !code.includes('<html')) {
    return { complete: false, reason: 'Missing HTML start tag' };
  }
  if (!code.includes('</html>')) {
    return { complete: false, reason: 'Missing closing </html> tag' };
  }
  if (!code.includes('</body>')) {
    return { complete: false, reason: 'Missing closing </body> tag' };
  }
  // Check for unterminated strings (common in truncated code)
  const lines = code.split('\n');
  const lastLine = lines[lines.length - 1];
  if (lastLine.trim().endsWith(',') || lastLine.trim().endsWith('{')) {
    return { complete: false, reason: 'Code appears truncated (ends with comma or brace)' };
  }
  return { complete: true };
}
/**
 * Remove restrictive CSP meta tags from generated code
 * This prevents Google Fonts and other resources from being blocked
 */
function removeRestrictiveCSP(html: string): string {
  // Remove any CSP meta tags
  return html.replace(
    /<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/gi,
    ''
  );
}
// Validate and fix generated code before saving
function isCodeValid(code: string): { valid: boolean; reason?: string } {
  // Unterminated className (className opened but not closed on same line)
  if (/className="[^"]*\n[^"]*</.test(code)) {
    const reason = 'Unterminated className attribute detected';
    console.error('Validation failed:', reason);
    return { valid: false, reason };
  }
  // Incomplete HTML (missing </html>)
  if (!code.includes('</html>')) {
    const reason = 'Missing </html> tag';
    console.error('Validation failed:', reason);
    return { valid: false, reason };
  }
  // Unbalanced quotes
  const quotes = (code.match(/"/g) || []).length;
  if (quotes % 2 !== 0) {
    const reason = 'Unmatched quotes detected';
    console.error('Validation failed:', reason);
    return { valid: false, reason };
  }
  // Hooks in class or constructor (React error #321)
  if (/class\s+\w+\s*\{[\s\S]*use(State|Effect|Ref|Context|Reducer|Callback|Memo|ImperativeHandle|LayoutEffect|DebugValue)\s*\(/.test(code)) {
    const reason = 'React hooks used inside a class or constructor';
    console.error('Validation failed:', reason);
    return { valid: false, reason };
  }
  // (Removed) Hooks outside function components check: was too broad and caused false positives
  return { valid: true };
}

function validateAndFixGeneratedCode(code: string): string {
  // Remove any preamble text before <!DOCTYPE html>
  const doctypeIndex = code.indexOf('<!DOCTYPE html>');
  if (doctypeIndex > 0) {
    code = code.substring(doctypeIndex);
  }
  const validation = isCodeValid(code);
  if (!validation.valid) {
    throw new Error(validation.reason || 'Invalid code generated');
  }
  // Ensure ReactRouterDOM is accessed safely
  if (code.includes('ReactRouterDOM')) {
    if (!code.includes('window.ReactRouterDOM') && !code.includes('const ReactRouterDOM = window.ReactRouterDOM')) {
      console.warn('⚠️  React Router usage detected - adding safety check');
    }
  }
  return code;
}

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
      // Remove markdown code blocks if present
      if (code.includes('```html')) {
        code = code
          .replace(/```html\n?/g, '')
          .replace(/```\n?$/g, '')
          .trim();
        console.log('After markdown removal:', code.substring(0, 100));
      }
      // Log AI response stats for diagnostics
      console.log('📊 CODE STATS:');
      console.log('Length:', code.length, 'characters');
      console.log('Lines:', code.split('\n').length);
      console.log('Starts with:', code.substring(0, 100));
      console.log('Ends with:', code.substring(Math.max(0, code.length - 100)));
      const hasHtmlStart = code.includes('<!DOCTYPE html>') || code.includes('<html');
      const hasHtmlEnd = code.includes('</html>');
      const hasBodyEnd = code.includes('</body>');
      console.log('Complete HTML?', { hasHtmlStart, hasHtmlEnd, hasBodyEnd });
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

    // Remove restrictive CSP meta tags
    code = removeRestrictiveCSP(code);

    // Check for completeness before validation
    const completeness = isCodeComplete(code);
    if (!completeness.complete) {
      console.error('Incomplete code:', completeness.reason);
      return NextResponse.json({
        error: 'Generated code is incomplete',
        reason: completeness.reason,
        suggestion: 'Try simplifying your request or breaking it into smaller features',
        codePreview: code.substring(0, 500)
      }, { status: 400 });
    }

    // Validate and fix generated code
    try {
      code = validateAndFixGeneratedCode(code);
    } catch (validationError) {
      console.error('❌ Code validation failed:', validationError);
      console.error('--- AI generated code start ---');
      console.error(code);
      console.error('--- AI generated code end ---');
      return NextResponse.json({ 
        error: 'Generated code has syntax errors. Please try a different prompt.',
        details: validationError instanceof Error ? validationError.message : String(validationError),
        codePreview: code.substring(0, 500)
      }, { status: 400 });
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