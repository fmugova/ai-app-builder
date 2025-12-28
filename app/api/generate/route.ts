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

    const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SITE_TITLE_PLACEHOLDER</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script crossorigin src="https://cdn.jsdelivr.net/npm/react-router-dom@6.20.1/dist/umd/react-router-dom.production.min.js"></script>
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
      <p style="color:#666;">Loading...</p>
    </div>
  </div>
  
  <script type="text/babel">
    (function initApp() {
      let attempts = 0;
      const maxAttempts = 50;
      
      function checkDependencies() {
        attempts++;
        
        // SAFE: Use optional chaining to prevent errors
        const reactReady = typeof window.React?.createElement === 'function';
        const reactDOMReady = typeof window.ReactDOM?.createRoot === 'function';
        const routerReady = typeof window.ReactRouterDOM?.HashRouter === 'function' &&
                           typeof window.ReactRouterDOM?.Routes === 'function';
        
        console.log('Attempt', attempts, ':', {
          React: reactReady,
          ReactDOM: reactDOMReady,
          ReactRouter: routerReady
        });
        
        if (reactReady && reactDOMReady && routerReady) {
          console.log('✅ All dependencies loaded! Initializing app...');
          clearInterval(checkInterval);
          startApp();
        } else if (attempts >= maxAttempts) {
          console.error('❌ Failed to load dependencies after', attempts, 'attempts');
          clearInterval(checkInterval);
          showError();
        }
      }
      
      const checkInterval = setInterval(checkDependencies, 100);
      
      function showError() {
        const root = document.getElementById('root');
        root.innerHTML = '<div style="padding:40px;text-align:center;font-family:system-ui;"><h1 style="color:#ef4444;margin-bottom:20px;">⚠️ Failed to Load</h1><p style="color:#666;margin-bottom:20px;">Required libraries could not be loaded. This may be due to:</p><ul style="text-align:left;max-width:400px;margin:0 auto;color:#666;"><li>Network connectivity issues</li><li>CDN blocking (firewall/ad blocker)</li><li>Browser compatibility issues</li></ul><button onclick="location.reload()" style="margin-top:30px;padding:12px 24px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer;font-size:16px;">Retry</button></div>';
      }
      
      function startApp() {
        try {
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
                        className: 'text-gray-700 hover:text-blue-600 font-medium ' + (location.pathname === link.to ? 'text-blue-600' : '')
                      }, link.label)
                    )
                  ),
                  React.createElement('button', {
                    onClick: () => setIsOpen(!isOpen),
                    className: 'md:hidden p-2'
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
                isOpen && React.createElement('div', { className: 'md:hidden pb-4' },
                  links.map(link =>
                    React.createElement(Link, {
                      key: link.to,
                      to: link.to,
                      className: 'block px-4 py-2 text-gray-700 hover:bg-gray-100'
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
                  React.createElement('h1', { className: 'text-5xl font-bold mb-6' }, 'HERO_TITLE_PLACEHOLDER'),
                  React.createElement('p', { className: 'text-xl text-gray-600 mb-8' }, 'HERO_TEXT_PLACEHOLDER'),
                  React.createElement(Link, {
                    to: '/contact',
                    className: 'inline-block px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold'
                  }, 'Get Started')
                )
              ),
              React.createElement('section', { className: 'py-20' },
                React.createElement('div', { className: 'max-w-7xl mx-auto px-4' },
                  React.createElement('h2', { className: 'text-4xl font-bold text-center mb-12' }, 'Features'),
                  React.createElement('div', { className: 'grid md:grid-cols-3 gap-8' }, 'FEATURES_PLACEHOLDER')
                )
              )
            );
          }
          
          function AboutPage() {
            return React.createElement('div', { className: 'min-h-screen pt-24 py-20' },
              React.createElement('div', { className: 'max-w-4xl mx-auto px-4' },
                React.createElement('h1', { className: 'text-5xl font-bold mb-8' }, 'About Us'),
                React.createElement('p', { className: 'text-xl text-gray-600' }, 'ABOUT_TEXT_PLACEHOLDER')
              )
            );
          }
          
          function ServicesPage() {
            return React.createElement('div', { className: 'min-h-screen pt-24 py-20' },
              React.createElement('div', { className: 'max-w-7xl mx-auto px-4' },
                React.createElement('h1', { className: 'text-5xl font-bold text-center mb-12' }, 'Our Services'),
                React.createElement('div', { className: 'grid md:grid-cols-2 gap-8' }, 'SERVICES_PLACEHOLDER')
              )
            );
          }
          
          function ContactPage() {
            const [formData, setFormData] = useState({ name: '', email: '', message: '' });
            const [submitted, setSubmitted] = useState(false);
            
            const handleSubmit = (e) => {
              e.preventDefault();
              setSubmitted(true);
              setTimeout(() => setSubmitted(false), 3000);
            };
            
            return React.createElement('div', { className: 'min-h-screen pt-24 py-20' },
              React.createElement('div', { className: 'max-w-2xl mx-auto px-4' },
                React.createElement('h1', { className: 'text-5xl font-bold text-center mb-12' }, 'Contact Us'),
                submitted && React.createElement('div', {
                  className: 'mb-6 p-4 bg-green-100 text-green-700 rounded-lg'
                }, 'Thank you!'),
                React.createElement('form', {
                  onSubmit: handleSubmit,
                  className: 'space-y-6'
                },
                  React.createElement('input', {
                    type: 'text',
                    required: true,
                    placeholder: 'Name',
                    className: 'w-full px-4 py-3 border rounded-lg',
                    value: formData.name,
                    onChange: (e) => setFormData({...formData, name: e.target.value})
                  }),
                  React.createElement('input', {
                    type: 'email',
                    required: true,
                    placeholder: 'Email',
                    className: 'w-full px-4 py-3 border rounded-lg',
                    value: formData.email,
                    onChange: (e) => setFormData({...formData, email: e.target.value})
                  }),
                  React.createElement('textarea', {
                    required: true,
                    placeholder: 'Message',
                    rows: 5,
                    className: 'w-full px-4 py-3 border rounded-lg',
                    value: formData.message,
                    onChange: (e) => setFormData({...formData, message: e.target.value})
                  }),
                  React.createElement('button', {
                    type: 'submit',
                    className: 'w-full px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold'
                  }, 'Send')
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
          
          console.log('✅ App rendered successfully!');
        } catch (error) {
          console.error('❌ Error rendering app:', error);
          document.getElementById('root').innerHTML = '<div style="padding:40px;text-align:center;color:#ef4444;"><h1>Render Error</h1><p>' + error.message + '</p></div>';
        }
      }
    })();
  </script>
</body>
</html>`;

    const systemPrompt = `You are an expert React developer creating production-ready single-page applications.

Generate a complete HTML file based on this template:

${htmlTemplate}

Replace these placeholders with content based on the user's request:
- SITE_TITLE_PLACEHOLDER → appropriate site title
- BRAND_NAME_PLACEHOLDER → brand/company name
- HERO_TITLE_PLACEHOLDER → compelling hero headline
- HERO_TEXT_PLACEHOLDER → hero subtext
- ABOUT_TEXT_PLACEHOLDER → about page content
- FEATURES_PLACEHOLDER → 3 feature cards with icons, titles, and descriptions
- SERVICES_PLACEHOLDER → 4 service cards

For FEATURES_PLACEHOLDER, use React.createElement to build the JSX structure.
For SERVICES_PLACEHOLDER, use React.createElement to build the JSX structure.

USER REQUEST: "${prompt}"

Generate the complete HTML file with all placeholders replaced.`;

    const message = await callClaudeWithRetry(anthropic, [{ role: 'user', content: systemPrompt }]);

    let code = '';
    if (message.content && message.content[0]) {
      const content = message.content[0];
      code = content.type === 'text' ? content.text : '';
    } else {
      return NextResponse.json({ error: 'Invalid AI response' }, { status: 500 });
    }

    code = code
      .replace(/```html\n?/g, '')
      .replace(/```jsx\n?/g, '')
      .replace(/```typescript\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    if (!code.startsWith('<!DOCTYPE')) {
      code = `<!DOCTYPE html>\n${code}`
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { generationsUsed: { increment: 1 } },
    })

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