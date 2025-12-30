import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import Anthropic from "@anthropic-ai/sdk"
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, rateLimits } from '@/lib/rateLimit'

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

    const { prompt, type } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // HTML Template with all fixes
    const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SITE_TITLE_PLACEHOLDER</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; font-family: system-ui; }
    @keyframes spin { to { transform: rotate(360deg); }}
  </style>
</head>
<body>
  <div id="root">
    <div style="padding:40px;text-align:center;">
      <div style="width:40px;height:40px;border:4px solid #e5e7eb;border-top-color:#3b82f6;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px;"></div>
      <p style="color:#666;">Loading React Router...</p>
    </div>
  </div>
  
  <script>
    (function loadReactRouter() {
      console.log('Loading React Router with CDN fallback...');
      const script1 = document.createElement('script');
      script1.crossOrigin = 'anonymous';
      script1.src = 'https://unpkg.com/react-router-dom@6.20.1/dist/umd/react-router-dom.production.min.js';
      script1.onload = function() { console.log('React Router loaded'); if(window.initApp) window.initApp(); };
      script1.onerror = function() {
        console.error('Failed to load React Router');
        document.getElementById('root').innerHTML = '<div style="padding:40px;text-align:center;"><h1 style="color:red;">Failed to load React Router</h1><button onclick="location.reload()" style="padding:10px 20px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer;">Retry</button></div>';
      };
      document.head.appendChild(script1);
    })();
  </script>
  
  <script type="text/babel">
    window.initApp = function() {
      let attempts = 0;
      const check = setInterval(() => {
        attempts++;
        const ready = window.React && window.ReactDOM && window.ReactRouterDOM;
        console.log('Check', attempts, ':', { ready });
        if (ready) {
          clearInterval(check);
          startApp();
        } else if (attempts > 30) {
          clearInterval(check);
          document.getElementById('root').innerHTML = '<div style="padding:40px;text-align:center;"><h1 style="color:red;">Timeout</h1></div>';
        }
      }, 100);
    };
    
    function startApp() {
      const { useState, useEffect } = React;
      const { HashRouter, Routes, Route, Link, useLocation } = window.ReactRouterDOM;
      
      function Navigation() {
        const [isOpen, setIsOpen] = useState(false);
        const location = useLocation();
        useEffect(() => setIsOpen(false), [location]);
        
        const links = [
          { to: '/', label: 'Home' },
          { to: '/about', label: 'About' },
          { to: '/services', label: 'Services' },
          { to: '/contact', label: 'Contact' }
        ];
        
        // FIXED: Mobile navigation click handler to prevent nesting
        const handleNavClick = (e, to) => {
          e.preventDefault();
          e.stopPropagation();
          window.location.hash = to === '/' ? '' : to;
          setIsOpen(false);
        };
        
        return React.createElement('nav', { className: 'fixed top-0 left-0 right-0 z-50 bg-white shadow' },
          React.createElement('div', { className: 'max-w-7xl mx-auto px-4' },
            React.createElement('div', { className: 'flex justify-between items-center h-16' },
              React.createElement(Link, { to: '/', className: 'flex items-center space-x-2' },
                React.createElement('div', { className: 'w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg' }),
                React.createElement('span', { className: 'text-xl font-bold' }, 'BRAND_NAME_PLACEHOLDER')
              ),
              React.createElement('div', { className: 'hidden md:flex space-x-8' },
                links.map(link =>
                  React.createElement(Link, {
                    key: link.to,
                    to: link.to,
                    className: 'text-gray-700 hover:text-blue-600 font-medium transition-colors ' + (location.pathname === link.to ? 'text-blue-600' : '')
                  }, link.label)
                )
              ),
              React.createElement('button', {
                onClick: () => setIsOpen(!isOpen),
                className: 'md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors',
                'aria-label': 'Toggle menu'
              }, React.createElement('svg', {
                className: 'w-6 h-6',
                fill: 'none',
                stroke: 'currentColor',
                viewBox: '0 0 24 24'
              }, isOpen ?
                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M6 18L18 6M6 6l12 12' }) :
                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M4 6h16M4 12h16M4 18h16' })
              ))
            ),
            isOpen && React.createElement('div', { className: 'md:hidden pb-4 border-t' },
              links.map(link =>
                React.createElement('a', {
                  key: link.to,
                  href: '#' + (link.to === '/' ? '' : link.to),
                  onClick: (e) => handleNavClick(e, link.to),
                  className: 'block px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors ' + (location.pathname === link.to ? 'text-blue-600 bg-blue-50' : '')
                }, link.label)
              )
            )
          )
        );
      }
      
      function Footer() {
        return React.createElement('footer', { className: 'bg-gray-900 text-white py-12 mt-20' },
          React.createElement('div', { className: 'max-w-7xl mx-auto px-4 text-center' },
            React.createElement('p', { className: 'text-gray-400 mb-2' }, '© 2025 BRAND_NAME_PLACEHOLDER. All rights reserved.'),
            React.createElement('p', { className: 'text-sm' },
              '⚡ Built with ',
              React.createElement('a', {
                href: 'https://buildflow-ai.app',
                target: '_blank',
                rel: 'noopener noreferrer',
                className: 'text-blue-400 hover:text-blue-300 font-semibold'
              }, 'BuildFlow AI')
            )
          )
        );
      }
      
      function HomePage() {
        return React.createElement('div', { className: 'min-h-screen pt-16' },
          React.createElement('section', { className: 'bg-gradient-to-br from-blue-50 to-purple-50 py-32' },
            React.createElement('div', { className: 'max-w-7xl mx-auto px-4 text-center' },
              React.createElement('h1', { className: 'text-5xl md:text-6xl font-bold mb-6' }, 'HERO_TITLE_PLACEHOLDER'),
              React.createElement('p', { className: 'text-xl text-gray-600 mb-8 max-w-3xl mx-auto' }, 'HERO_TEXT_PLACEHOLDER'),
              React.createElement(Link, { to: '/contact', className: 'inline-block px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold transition-colors shadow-lg hover:shadow-xl' }, 'Get Started')
            )
          ),
          React.createElement('section', { className: 'py-20 bg-white' },
            React.createElement('div', { className: 'max-w-7xl mx-auto px-4' },
              React.createElement('h2', { className: 'text-4xl font-bold text-center mb-12' }, 'Features'),
              React.createElement('div', { className: 'grid md:grid-cols-3 gap-8' }, 'FEATURES_PLACEHOLDER')
            )
          )
        );
      }
      
      function AboutPage() {
        return React.createElement('div', { className: 'min-h-screen pt-24 py-20 bg-gray-50' },
          React.createElement('div', { className: 'max-w-4xl mx-auto px-4' },
            React.createElement('h1', { className: 'text-5xl font-bold mb-8 text-center' }, 'About Us'),
            React.createElement('div', { className: 'bg-white rounded-lg shadow-lg p-8 md:p-12' },
              React.createElement('p', { className: 'text-xl text-gray-600 leading-relaxed' }, 'ABOUT_TEXT_PLACEHOLDER')
            )
          )
        );
      }
      
      function ServicesPage() {
        return React.createElement('div', { className: 'min-h-screen pt-24 py-20 bg-gray-50' },
          React.createElement('div', { className: 'max-w-7xl mx-auto px-4' },
            React.createElement('h1', { className: 'text-5xl font-bold text-center mb-4' }, 'Our Services'),
            React.createElement('p', { className: 'text-xl text-gray-600 text-center mb-12 max-w-3xl mx-auto' }, 'Discover what we can do for you'),
            React.createElement('div', { className: 'grid md:grid-cols-2 gap-8' }, 'SERVICES_PLACEHOLDER')
          )
        );
      }
      
      function ContactPage() {
        const [formData, setFormData] = useState({ name: '', email: '', message: '' });
        const [submitted, setSubmitted] = useState(false);
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState('');
        
        const handleSubmit = async (e) => {
          e.preventDefault();
          setLoading(true);
          setError('');
          
          try {
            const response = await fetch('https://buildflow-ai.app/api/forms/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                siteId: 'SITE_ID_PLACEHOLDER',
                formType: 'contact',
                formData: formData
              })
            });
            
            const data = await response.json();
            
            if (response.ok) {
              setSubmitted(true);
              setFormData({ name: '', email: '', message: '' });
              setTimeout(() => setSubmitted(false), 5000);
            } else {
              setError(data.error || 'Failed to send message. Please try again.');
            }
          } catch (err) {
            setError('Network error. Please try again.');
          } finally {
            setLoading(false);
          }
        };
        
        return React.createElement('div', { className: 'min-h-screen pt-24 py-20 bg-gray-50' },
          React.createElement('div', { className: 'max-w-2xl mx-auto px-4' },
            React.createElement('h1', { className: 'text-5xl font-bold text-center mb-4' }, 'Contact Us'),
            React.createElement('p', { className: 'text-xl text-gray-600 text-center mb-12' }, 'Get in touch with us today'),
            React.createElement('div', { className: 'bg-white rounded-lg shadow-lg p-8 md:p-12' },
              submitted && React.createElement('div', { 
                className: 'mb-6 p-4 bg-green-100 text-green-700 rounded-lg text-center font-semibold' 
              }, '✓ Thank you! We\'ll be in touch soon.'),
              error && React.createElement('div', { 
                className: 'mb-6 p-4 bg-red-100 text-red-700 rounded-lg text-center' 
              }, error),
              React.createElement('form', { onSubmit: handleSubmit, className: 'space-y-6' },
                React.createElement('div', null,
                  React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Name'),
                  React.createElement('input', { 
                    type: 'text', 
                    required: true, 
                    placeholder: 'Your name', 
                    className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent', 
                    value: formData.name, 
                    onChange: (e) => setFormData({...formData, name: e.target.value}) 
                  })
                ),
                React.createElement('div', null,
                  React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Email'),
                  React.createElement('input', { 
                    type: 'email', 
                    required: true, 
                    placeholder: 'your@email.com', 
                    className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent', 
                    value: formData.email, 
                    onChange: (e) => setFormData({...formData, email: e.target.value}) 
                  })
                ),
                React.createElement('div', null,
                  React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Message'),
                  React.createElement('textarea', { 
                    required: true, 
                    placeholder: 'How can we help you?', 
                    rows: 5, 
                    className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none', 
                    value: formData.message, 
                    onChange: (e) => setFormData({...formData, message: e.target.value}) 
                  })
                ),
                React.createElement('button', { 
                  type: 'submit', 
                  disabled: loading,
                  className: 'w-full px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold transition-colors shadow-lg hover:shadow-xl' 
                }, loading ? 'Sending...' : 'Send Message')
              )
            )
          )
        );
      }
      
      function App() {
        return React.createElement(HashRouter, null,
          React.createElement(Navigation),
          React.createElement(Routes, null,
            React.createElement(Route, { path: '/', element: React.createElement(HomePage) }),
            React.createElement(Route, { path: '/about', element: React.createElement(AboutPage) }),
            React.createElement(Route, { path: '/services', element: React.createElement(ServicesPage) }),
            React.createElement(Route, { path: '/contact', element: React.createElement(ContactPage) })
          ),
          React.createElement(Footer)
        );
      }
      
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(App));
      console.log('App rendered!');
    }
  </script>
</body>
</html>`;

    // UPDATED SYSTEM PROMPT with better instructions
    const systemPrompt = `You are an expert React developer. Generate a complete, professional HTML file for: "${prompt}"

CRITICAL RULES:
1. Use the provided HTML template structure exactly
2. Replace ALL placeholders with real, relevant content:
   - SITE_TITLE_PLACEHOLDER → Actual site title
   - BRAND_NAME_PLACEHOLDER → Brand/company name
   - HERO_TITLE_PLACEHOLDER → Compelling hero headline
   - HERO_TEXT_PLACEHOLDER → Engaging hero description
   - FEATURES_PLACEHOLDER → 3 feature cards with icons, titles, descriptions
   - ABOUT_TEXT_PLACEHOLDER → Comprehensive about section (3-4 paragraphs)
   - SERVICES_PLACEHOLDER → 4-6 service cards with details
   - SITE_ID_PLACEHOLDER → KEEP AS-IS (injected later)

3. FORBIDDEN IN FOOTER:
   - NO "This uses modals" or technical descriptions
   - NO "Built with React" explanations
   - ONLY copyright + BuildFlow link

4. Features must be React elements:
   Example: React.createElement('div', { className: 'bg-white p-6 rounded-lg shadow' },
     React.createElement('div', { className: 'text-4xl mb-4' }, '🚀'),
     React.createElement('h3', { className: 'text-xl font-bold mb-2' }, 'Fast Performance'),
     React.createElement('p', { className: 'text-gray-600' }, 'Lightning-fast load times')
   )

5. Services must be React elements with detailed cards

6. Generate COMPLETE, PRODUCTION-READY code
7. NO explanatory text in HTML
8. NO placeholder text that says "[Add content here]"
9. ALL content must be fully fleshed out and relevant to: "${prompt}"

Generate the complete HTML now:`;

    const message = await callClaudeWithRetry(anthropic, [{ role: 'user', content: systemPrompt }]);

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
      .replace(/```\n?/g, '')
      .trim()

    // Ensure DOCTYPE
    if (!code.startsWith('<!DOCTYPE')) {
      code = `<!DOCTYPE html>\n${code}`
    }

    // Update user stats
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

    console.log('Generation successful, code length:', code.length)
    return NextResponse.json({ code })

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