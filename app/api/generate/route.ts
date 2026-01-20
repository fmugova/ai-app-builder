import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import Anthropic from "@anthropic-ai/sdk"
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, rateLimits } from '@/lib/rateLimit'
import { getAnalyticsScript } from '@/lib/analytics-script'
import { ENHANCED_GENERATION_SYSTEM_PROMPT } from '@/lib/enhanced-system-prompt'

export const dynamic = 'force-dynamic'

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

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
  
  // Check for unterminated code (common in truncated responses)
  const lines = code.split('\n');
  const lastLine = lines[lines.length - 1].trim();
  if (lastLine.endsWith(',') || lastLine.endsWith('{') || lastLine.endsWith('(')) {
    return { complete: false, reason: 'Code appears truncated (ends with comma/brace/paren)' };
  }
  
  return { complete: true };
}

function isCodeValid(code: string): { valid: boolean; reason?: string } {
  // For HTML artifacts, only check basic structure
  if (code.trim().startsWith('<!DOCTYPE html>')) {
    if (!code.includes('</html>')) {
      return { valid: false, reason: 'Missing </html> tag' };
    }
    if (!code.includes('</body>')) {
      return { valid: false, reason: 'Missing </body> tag' };
    }
    // Skip other checks for HTML - they cause false positives
    return { valid: true };
  }

  // Only check for hooks in classes (React error #321)
  if (/class\s+\w+\s*\{[\s\S]*use(State|Effect|Ref|Context|Reducer|Callback|Memo|ImperativeHandle|LayoutEffect|DebugValue)\s*\(/.test(code)) {
    return { valid: false, reason: 'React hooks used inside a class component' };
  }

  return { valid: true };
}

function validateAndFixGeneratedCode(code: string): string {
  console.log('📊 CODE VALIDATION STATS:');
  console.log('Length:', code.length, 'characters');
  console.log('Lines:', code.split('\n').length);
  console.log('Starts with:', code.substring(0, 100).replace(/\n/g, '\\n'));
  console.log('Ends with:', code.substring(Math.max(0, code.length - 100)).replace(/\n/g, '\\n'));

  // Remove any preamble before <!DOCTYPE html>
  const doctypeIndex = code.indexOf('<!DOCTYPE html>');
  if (doctypeIndex > 0) {
    console.log('⚠️  Removing', doctypeIndex, 'characters before DOCTYPE');
    code = code.substring(doctypeIndex);
  }

  // Check structure
  const hasHtmlStart = code.includes('<!DOCTYPE html>') || code.includes('<html');
  const hasHtmlEnd = code.includes('</html>');
  const hasBodyEnd = code.includes('</body>');
  console.log('Structure check:', { hasHtmlStart, hasHtmlEnd, hasBodyEnd });

  // For HTML, validate completeness
  if (code.trim().startsWith('<!DOCTYPE html>')) {
    if (!hasHtmlStart || !hasHtmlEnd || !hasBodyEnd) {
      console.error('❌ Incomplete HTML structure');
      throw new Error('Incomplete HTML structure - code appears truncated');
    }
    
    if (code.length < 1000) {
      console.error('❌ HTML too short - likely truncated');
      throw new Error('Generated HTML is too short - appears incomplete');
    }

    console.log('✅ HTML validation passed');
    return code;
  }

  // For non-HTML code
  const validation = isCodeValid(code);
  if (!validation.valid) {
    console.error('❌ Code validation failed:', validation.reason);
    throw new Error(validation.reason || 'Invalid code generated');
  }

  console.log('✅ Code validation passed');
  return code;
}

function removeRestrictiveCSP(html: string): string {
  // Remove any CSP meta tags that would block resources
  return html.replace(
    /<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/gi,
    ''
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function needsAuthentication(prompt: string): boolean {
  const authKeywords = [
    'login', 'signup', 'sign up', 'sign in', 'authentication', 'auth',
    'user accounts', 'register', 'registration', 'protected', 'private', 
    'members only', 'dashboard', 'profile', 'saas', 'admin', 'booking',
    'social network', 'user management', 'customer portal', 'subscription',
    'member site', 'e-learning', 'marketplace', 'community', 'forum'
  ];
  
  const lowerPrompt = prompt.toLowerCase();
  return authKeywords.some(keyword => lowerPrompt.includes(keyword));
}

function selectAuthProvider(prompt: string): 'nextauth' | 'supabase' | 'jwt' {
  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes('supabase') && !lowerPrompt.includes('nextauth')) {
    return 'supabase';
  }
  if (lowerPrompt.includes('jwt') || lowerPrompt.includes('custom auth')) {
    return 'jwt';
  }
  return 'nextauth'; // Default
}

async function callClaudeWithRetry(
  anthropic: Anthropic, 
  messages: Anthropic.MessageParam[], 
  maxRetries = 3
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16000,
        messages: messages
      });
      return response;
    } catch (error: unknown) {
      const errorObj = error as { error?: { type?: string } };
      const isOverloaded = errorObj?.error?.type === 'overloaded_error';
      const isLastAttempt = attempt === maxRetries - 1;

      if (isOverloaded && !isLastAttempt) {
        const delay = Math.pow(2, attempt + 1) * 1000;
        console.log(`⏳ Claude overloaded, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

function injectAnalytics(code: string, projectId: string): string {
  const analyticsScript = getAnalyticsScript(projectId);
  
  // Find the last </script> tag
  const lastScriptClose = code.lastIndexOf('</script>');
  
  if (lastScriptClose === -1) {
    // No scripts - inject before </body>
    const bodyClose = code.lastIndexOf('</body>');
    if (bodyClose === -1) {
      console.warn('⚠️ No </body> found, appending analytics at end');
      return code + '\n' + analyticsScript;
    }
    return code.substring(0, bodyClose) + '\n' + analyticsScript + '\n' + code.substring(bodyClose);
  }
  
  // Find </body> after the last script
  const actualBodyClose = code.indexOf('</body>', lastScriptClose);
  
  if (actualBodyClose === -1) {
    console.warn('⚠️ No </body> after scripts, appending at end');
    return code + '\n' + analyticsScript;
  }
  
  console.log('✅ Injecting analytics before </body> at position:', actualBodyClose);
  return (
    code.substring(0, actualBodyClose) +
    '\n' + analyticsScript + '\n' +
    code.substring(actualBodyClose)
  );
}

// ============================================================================
// MAIN ROUTE HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize Anthropic
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Rate limiting
    const rateLimitResult = checkRateLimit(`ai:${session.user.email}`, rateLimits.aiGeneration);
    if (!rateLimitResult.allowed) {
      const resetIn = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${resetIn}s.` },
        { status: 429 }
      );
    }

    // Get user and check limits
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        generationsUsed: true,
        generationsLimit: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const limit = user.generationsLimit || 10;
    if ((user.generationsUsed || 0) >= limit) {
      return NextResponse.json(
        { error: 'AI request limit reached. Please upgrade your plan.' },
        { status: 429 }
      );
    }

    // Parse request
    const { prompt, type, projectId } = await request.json();

    // Detect requirements
    const requiresAuth = needsAuthentication(prompt);
    const authProvider = requiresAuth ? selectAuthProvider(prompt) : null;

    // Get database config if available
    let databaseConfig = null;
    if (projectId) {
      const dbConnection = await prisma.databaseConnection.findFirst({
        where: {
          OR: [
            { projectId: projectId },
            { userId: user.id }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
      
      if (dbConnection) {
        databaseConfig = {
          url: dbConnection.supabaseUrl,
          anonKey: dbConnection.supabaseAnonKey
        };
      }
    }

    // Build final prompt
    let finalPrompt = ENHANCED_GENERATION_SYSTEM_PROMPT + '\n\n';


    if (databaseConfig) {
      finalPrompt += `
✅ USER HAS CONNECTED SUPABASE DATABASE - USE THESE CREDENTIALS:

const SUPABASE_URL = '${databaseConfig.url}';
const SUPABASE_ANON_KEY = '${databaseConfig.anonKey}';

DO NOT use placeholder credentials. The app should connect immediately.
`;
    } else {
      finalPrompt += `
⚠️ IMPORTANT: User has NOT connected a database.

DO NOT include Supabase or any database code.
Use localStorage for data persistence instead.

Example localStorage pattern:
const [data, setData] = useState([]);

useEffect(() => {
  const saved = localStorage.getItem('myData');
  if (saved) setData(JSON.parse(saved));
}, []);

function saveData(newData) {
  setData(newData);
  localStorage.setItem('myData', JSON.stringify(newData));
}
`;
    }

    if (requiresAuth && authProvider) {
      finalPrompt += `
🔐 AUTHENTICATION REQUIRED!

Include complete authentication system:
- Beautiful login/signup pages
- Protected routes
- Session management  
- Sign out functionality

Make it production-ready and seamless!
`;
    }

    finalPrompt += `\n\nUSER REQUEST: "${prompt}"\n\nGenerate a complete, production-ready, single-file HTML application.`;

    console.log('🚀 Calling Claude API...');
    const message = await callClaudeWithRetry(anthropic, [
      { role: 'user', content: finalPrompt }
    ]);

    // Extract code from response
    let code = '';
    if (message.content && message.content[0]) {
      const content = message.content[0];
      code = content.type === 'text' ? content.text : '';
      
      // Check for truncation
      if (message.stop_reason === 'max_tokens') {
        console.error('⚠️  Response hit max_tokens limit');
        throw new Error('Generated code exceeded token limit. Try simplifying your request.');
      }
    } else {
      console.error('❌ Invalid AI response structure:', message);
      return NextResponse.json({ error: 'Invalid AI response' }, { status: 500 });
    }

    // Clean up markdown code blocks
    code = code
      .replace(/```html\n?/g, '')
      .replace(/```jsx\n?/g, '')
      .replace(/```typescript\n?/g, '')
      .replace(/```javascript\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Ensure DOCTYPE
    if (!code.startsWith('<!DOCTYPE')) {
      code = `<!DOCTYPE html>\n${code}`;
    }

    // Remove restrictive CSP
    code = removeRestrictiveCSP(code);

    // Log stats
    console.log('📊 GENERATED CODE STATS:');
    console.log('Length:', code.length, 'characters');
    console.log('Lines:', code.split('\n').length);

    // Check completeness FIRST
    const completeness = isCodeComplete(code);
    if (!completeness.complete) {
      console.error('❌ Code incomplete:', completeness.reason);
      return NextResponse.json({
        error: 'Generated code is incomplete',
        reason: completeness.reason,
        suggestion: 'Try simplifying your request or breaking it into smaller features',
        codePreview: code.substring(0, 500)
      }, { status: 400 });
    }

    // Validate code
    try {
      code = validateAndFixGeneratedCode(code);
    } catch (validationError) {
      console.error('❌ Validation failed:', validationError);
      console.error('--- Generated code preview ---');
      console.error(code.substring(0, 1000));
      return NextResponse.json({ 
        error: 'Generated code has errors. Please try a different prompt.',
        details: validationError instanceof Error ? validationError.message : String(validationError),
        codePreview: code.substring(0, 500)
      }, { status: 400 });
    }

    // Inject analytics placeholder
    const codeWithAnalytics = injectAnalytics(code, 'SITE_ID_PLACEHOLDER');

    // Save to database
    let project;
    let finalCode: string;
    
    if (projectId) {
      // Update existing project
      const existingProject = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: user.id
        }
      });
      
      if (!existingProject) {
        return NextResponse.json(
          { error: 'Project not found or unauthorized' },
          { status: 404 }
        );
      }
      
      console.log('🔄 Updating existing project:', projectId);
      
      // Replace placeholder with actual ID
      finalCode = codeWithAnalytics.replace(/SITE_ID_PLACEHOLDER/g, projectId);
      
      project = await prisma.project.update({
        where: { id: projectId },
        data: {
          code: finalCode,
          description: requiresAuth 
            ? `Auth-enabled (${authProvider}): ${new Date().toLocaleDateString()}`
            : `Regenerated: ${new Date().toLocaleDateString()}`,
          updatedAt: new Date()
        }
      });
    } else {
      // Create new project
      console.log('✨ Creating new project');
      
      project = await prisma.project.create({
        data: {
          userId: user.id,
          name: prompt.substring(0, 100) || 'Generated Project',
          description: requiresAuth 
            ? `Auth-enabled (${authProvider}): ${new Date().toLocaleDateString()}`
            : `Generated: ${new Date().toLocaleDateString()}`,
          code: codeWithAnalytics,
          type: type || 'landing-page',
          publishedAt: null
        }
      });

      // Replace placeholder with actual ID
      finalCode = codeWithAnalytics.replace(/SITE_ID_PLACEHOLDER/g, project.id);

      // Update with final code
      await prisma.project.update({
        where: { id: project.id },
        data: { code: finalCode }
      });
    }

    // Update user stats
    await prisma.user.update({
      where: { id: user.id },
      data: { generationsUsed: { increment: 1 } },
    });

    // Check usage alerts (non-blocking)
    import('@/lib/usage-alerts').then(({ checkUsageAlerts }) => {
      checkUsageAlerts(user.id).catch(err => 
        console.error('Usage alert check failed:', err)
      );
    });

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
    });

    console.log('✅ Generation successful:', project.id);
    
    return NextResponse.json({ 
      code: finalCode,
      projectId: project.id,
      requiresAuth,
      authProvider,
      message: requiresAuth 
        ? `Authentication system included using ${authProvider}.`
        : undefined
    });

  } catch (error: unknown) {
    console.error('❌ Generation error:', error);
    const errorObj = error as { 
      message?: string; 
      error?: { type?: string }; 
      status?: number; 
      stack?: string 
    };
    
    console.error('Error details:', {
      message: errorObj.message,
      type: errorObj?.error?.type,
      status: errorObj?.status
    });

    // Handle specific error types
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