import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import Anthropic from "@anthropic-ai/sdk"
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, rateLimits } from '@/lib/rateLimit'
import { getAnalyticsScript } from '@/lib/analytics-script'

export const dynamic = 'force-dynamic'

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
  if (code.includes('</body>')) {
    return code.replace('</body>', `${analyticsScript}\n</body>`)
  }
  return code + '\n' + analyticsScript
}

const GENERATION_SYSTEM_PROMPT = `
You are an expert full-stack web developer generating production-ready applications.

CRITICAL RULES:
1. Generate SINGLE-FILE HTML documents only
2. Use React 18+ with functional components and hooks via CDN
3. For multi-page navigation, use state-based routing (NOT React Router)
4. All JavaScript must be in <script type="text/babel"> tags
5. All CSS must use Tailwind CSS via CDN
6. No build tools required - must run directly in browser
7. Use CDN imports only

REQUIRED CDN LIBRARIES:
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated App</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Include Supabase if data persistence or auth is needed -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>
  <div id="root"></div>
  
  <script type="text/babel">
    const { useState, useEffect } = React;
    const { createClient } = supabase;
    
    // Supabase configuration (if needed)
    const SUPABASE_URL = 'YOUR_SUPABASE_URL';
    const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    function App() {
      // Your app logic here
      
      return (
        <div className="min-h-screen bg-gray-50">
          {/* Your UI here */}
        </div>
      );
    }
    
    ReactDOM.render(<App />, document.getElementById('root'));
  </script>
</body>
</html>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATABASE & AUTHENTICATION INTEGRATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHEN TO INCLUDE SUPABASE:
- User mentions: database, data storage, saving data, user accounts, login, authentication
- App requires: persistent storage, user profiles, real-time features, collaborative features
- Examples: todo lists, dashboards, social apps, booking systems, CRM, analytics

IF DATABASE IS NEEDED:
1. Add Supabase CDN script to <head>
2. Include commented SQL schema for reference
3. Provide setup instructions in comments
4. Generate complete CRUD operations
5. Include error handling for database operations

DATABASE SETUP TEMPLATE:
<script type="text/babel">
  const { useState, useEffect } = React;
  const { createClient } = supabase;
  
  // ⚠️ SETUP REQUIRED: Replace with your Supabase credentials
  // Get these from: https://supabase.com → Project Settings → API
  const SUPABASE_URL = 'https://your-project.supabase.co';
  const SUPABASE_ANON_KEY = 'your-anon-key-here';
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  /*
  SQL SCHEMA - Run this in Supabase SQL Editor:
  
  CREATE TABLE your_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  
  -- Enable Row Level Security
  ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
  
  -- Create policies
  CREATE POLICY "Users can read their own data"
    ON your_table FOR SELECT
    USING (auth.uid() = user_id);
  
  CREATE POLICY "Users can insert their own data"
    ON your_table FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  
  CREATE POLICY "Users can update their own data"
    ON your_table FOR UPDATE
    USING (auth.uid() = user_id);
  
  CREATE POLICY "Users can delete their own data"
    ON your_table FOR DELETE
    USING (auth.uid() = user_id);
  */
  
  function App() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Fetch data from Supabase
    async function fetchData() {
      try {
        setLoading(true);
        const { data, error } = await supabaseClient
          .from('your_table')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setData(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    // Create new record
    async function createRecord(newData) {
      try {
        const { data, error } = await supabaseClient
          .from('your_table')
          .insert([newData])
          .select()
          .single();
        
        if (error) throw error;
        setData([data, ...data]);
        return data;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    }
    
    // Update record
    async function updateRecord(id, updates) {
      try {
        const { data, error } = await supabaseClient
          .from('your_table')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        setData(prev => prev.map(item => item.id === id ? data : item));
        return data;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    }
    
    // Delete record
    async function deleteRecord(id) {
      try {
        const { error } = await supabaseClient
          .from('your_table')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        setData(prev => prev.filter(item => item.id !== id));
      } catch (err) {
        setError(err.message);
        throw err;
      }
    }
    
    useEffect(() => {
      fetchData();
      
      // Real-time subscription (optional)
      const subscription = supabaseClient
        .channel('your_table_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'your_table' },
          (payload) => {
            console.log('Change received!', payload);
            fetchData(); // Refresh data
          }
        )
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    }, []);
    
    // Your UI here
  }
</script>

IF AUTHENTICATION IS NEEDED:
1. Include Supabase Auth setup
2. Provide login/signup forms
3. Implement protected routes
4. Handle session management

AUTHENTICATION TEMPLATE:
<script type="text/babel">
  const { useState, useEffect } = React;
  const { createClient } = supabase;
  
  const SUPABASE_URL = 'https://your-project.supabase.co';
  const SUPABASE_ANON_KEY = 'your-anon-key-here';
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Check if user is logged in
    useEffect(() => {
      supabaseClient.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });
      
      const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
        (event, session) => {
          setUser(session?.user ?? null);
        }
      );
      
      return () => subscription.unsubscribe();
    }, []);
    
    // Sign up
    async function signUp(email, password) {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password
      });
      if (error) throw error;
      return data;
    }
    
    // Sign in
    async function signIn(email, password) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      return data;
    }
    
    // Sign out
    async function signOut() {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
    }
    
    if (loading) {
      return <div>Loading...</div>;
    }
    
    // Show login screen if not authenticated
    if (!user) {
      return <LoginForm onSignIn={signIn} onSignUp={signUp} />;
    }
    
    // Show protected content
    return (
      <div>
        <nav>
          <span>Welcome, {user.email}</span>
          <button onClick={signOut}>Sign Out</button>
        </nav>
        <YourProtectedContent />
      </div>
    );
  }
  
  function LoginForm({ onSignIn, onSignUp }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    
    async function handleSubmit(e) {
      e.preventDefault();
      try {
        if (isSignUp) {
          await onSignUp(email, password);
          alert('Check your email for confirmation!');
        } else {
          await onSignIn(email, password);
        }
      } catch (err) {
        alert(err.message);
      }
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-96">
          <h2 className="text-2xl font-bold mb-6">
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </h2>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded mb-4"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded mb-4"
            required
          />
          <button className="w-full bg-blue-600 text-white py-2 rounded">
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full mt-2 text-blue-600"
          >
            {isSignUp ? 'Already have an account?' : 'Need an account?'}
          </button>
        </form>
      </div>
    );
  }
</script>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MULTI-PAGE NAVIGATION (NO REACT ROUTER)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use state-based page switching:

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  
  const renderPage = () => {
    switch(currentPage) {
      case 'home': return <HomePage />;
      case 'about': return <AboutPage />;
      case 'contact': return <ContactPage />;
      default: return <HomePage />;
    }
  };
  
  return (
    <div>
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex gap-4">
          <button 
            onClick={() => setCurrentPage('home')} 
            className={currentPage === 'home' ? 'font-bold' : ''}
          >
            Home
          </button>
          <button 
            onClick={() => setCurrentPage('about')}
            className={currentPage === 'about' ? 'font-bold' : ''}
          >
            About
          </button>
        </div>
      </nav>
      <main>{renderPage()}</main>
    </div>
  );
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIREMENTS FOR ALL GENERATED APPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEVER use:
- import/export statements (use CDN only)
- React Router library
- npm packages
- Build tools (webpack, vite, etc.)
- Separate .js/.css files
- Module bundlers

ALWAYS include:
- Responsive design (mobile-first with Tailwind)
- Loading states for async operations
- Error handling with try/catch
- Form validation where applicable
- Accessibility (ARIA labels, semantic HTML)
- Clean, modern UI with proper spacing
- Smooth animations and transitions
- Comments explaining Supabase setup steps

SUPABASE SETUP INSTRUCTIONS:
Always include clear comments explaining:
1. How to get Supabase credentials
2. What SQL to run in Supabase SQL Editor
3. How to configure Row Level Security
4. Example database operations

IMPORTANT:
- All code must be self-contained in a single HTML file
- Must work when opened directly in a browser
- No external dependencies beyond CDN scripts
- Include placeholder credentials with clear instructions to replace
- Provide complete SQL schemas in comments
- Include RLS policies for security
`;

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

    // Update system prompt with database config
    let enhancedPrompt = `${GENERATION_SYSTEM_PROMPT}\n\n`
    
    if (databaseConfig) {
      enhancedPrompt += `
IMPORTANT: User has a connected Supabase database. Use these credentials:

const SUPABASE_URL = '${databaseConfig.url}';
const SUPABASE_ANON_KEY = '${databaseConfig.anonKey}';

DO NOT ask user to enter credentials. The app should work immediately.
`
    }
    
    enhancedPrompt += `Generate a complete, production-ready single-file HTML application for: "${prompt}"

Make it visually stunning, fully functional, and ready to deploy immediately.`

    const message = await callClaudeWithRetry(anthropic, [
      { 
        role: 'user', 
        content: enhancedPrompt 
      }
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

    // Auto-create project
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name: prompt.substring(0, 100) || 'Generated Project',
        description: `Generated: ${new Date().toLocaleDateString()}`,
        code: codeWithAnalytics,
        type: type || 'landing-page',
        publishedAt: null
      }
    })

    // Replace placeholder with actual project ID
    const finalCode = codeWithAnalytics.replace(/SITE_ID_PLACEHOLDER/g, project.id)

    // Update project with actual code
    await prisma.project.update({
      where: { id: project.id },
      data: { code: finalCode }
    })

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
        action: 'generated',
        metadata: {
          promptPreview: prompt.substring(0, 100),
          generationType: type || 'landing-page',
          projectId: project.id
        }
      }
    })

    console.log('Generation successful, project created:', project.id)
    
    return NextResponse.json({ 
      code: finalCode,
      projectId: project.id
    })

  } catch (error: any) {
    console.error('Generate error:', error)
    console.error('Error details:', {
      message: error.message,
      type: error?.error?.type,
      status: error?.status,
      stack: error.stack
    })

    if (error?.error?.type === 'overloaded_error') {
      return NextResponse.json(
        { error: 'Claude is experiencing high demand. Please try again in a moment.', retryable: true },
        { status: 503 }
      );
    }

    if (error?.status === 401) {
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