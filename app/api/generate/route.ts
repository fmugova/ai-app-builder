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

    // Construct the system prompt without nested template literals
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
    const { useState, useEffect } = React;
    
    function waitForReactRouter(callback) {
      let attempts = 0;
      const check = setInterval(() => {
        attempts++;
        if (window.ReactRouterDOM && window.ReactRouterDOM.HashRouter) {
          clearInterval(check);
          callback();
        } else if (attempts > 20) {
          clearInterval(check);
          document.getElementById('root').innerHTML = '<div style="padding:40px;text-align:center;"><h1 style="color:#ef4444;">Failed to load</h1></div>';
        }
      }, 100);
    }
    
    waitForReactRouter(() => {
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
        
        return (
          <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex justify-between items-center h-16">
                <Link to="/" className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg"></div>
                  <span className="text-xl font-bold">BRAND_NAME_PLACEHOLDER</span>
                </Link>
                <div className="hidden md:flex space-x-8">
                  {links.map(link => (
                    <Link key={link.to} to={link.to} className={'text-gray-700 hover:text-blue-600 font-medium ' + (location.pathname === link.to ? 'text-blue-600' : '')}>
                      {link.label}
                    </Link>
                  ))}
                </div>
                <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
                  </svg>
                </button>
              </div>
              {isOpen && (
                <div className="md:hidden pb-4">
                  {links.map(link => <Link key={link.to} to={link.to} className="block px-4 py-2 text-gray-700 hover:bg-gray-100">{link.label}</Link>)}
                </div>
              )}
            </div>
          </nav>
        );
      }
      
      function Footer() {
        return (
          <footer className="bg-gray-900 text-white py-12 mt-20">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <p className="text-gray-400 mb-2">© 2025 BRAND_NAME_PLACEHOLDER. All rights reserved.</p>
              <p className="text-sm">⚡ Built with <a href="https://buildflow-ai.app" target="_blank" className="text-blue-400 hover:text-blue-300 font-semibold">BuildFlow AI</a></p>
            </div>
          </footer>
        );
      }
      
      function HomePage() {
        return (
          <div className="min-h-screen pt-16">
            <section className="bg-gradient-to-br from-blue-50 to-purple-50 py-32">
              <div className="max-w-7xl mx-auto px-4 text-center">
                <h1 className="text-5xl font-bold mb-6">HERO_TITLE_PLACEHOLDER</h1>
                <p className="text-xl text-gray-600 mb-8">HERO_TEXT_PLACEHOLDER</p>
                <Link to="/contact" className="inline-block px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold">Get Started</Link>
              </div>
            </section>
            <section className="py-20">
              <div className="max-w-7xl mx-auto px-4">
                <h2 className="text-4xl font-bold text-center mb-12">Features</h2>
                <div className="grid md:grid-cols-3 gap-8">
                  FEATURES_PLACEHOLDER
                </div>
              </div>
            </section>
          </div>
        );
      }
      
      function AboutPage() {
        return (
          <div className="min-h-screen pt-24 py-20">
            <div className="max-w-4xl mx-auto px-4">
              <h1 className="text-5xl font-bold mb-8">About Us</h1>
              <p className="text-xl text-gray-600">ABOUT_TEXT_PLACEHOLDER</p>
            </div>
          </div>
        );
      }
      
      function ServicesPage() {
        return (
          <div className="min-h-screen pt-24 py-20">
            <div className="max-w-7xl mx-auto px-4">
              <h1 className="text-5xl font-bold text-center mb-12">Our Services</h1>
              <div className="grid md:grid-cols-2 gap-8">
                SERVICES_PLACEHOLDER
              </div>
            </div>
          </div>
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
        
        return (
          <div className="min-h-screen pt-24 py-20">
            <div className="max-w-2xl mx-auto px-4">
              <h1 className="text-5xl font-bold text-center mb-12">Contact Us</h1>
              {submitted && <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg">Thank you!</div>}
              <form onSubmit={handleSubmit} className="space-y-6">
                <input type="text" required placeholder="Name" className="w-full px-4 py-3 border rounded-lg" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                <input type="email" required placeholder="Email" className="w-full px-4 py-3 border rounded-lg" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                <textarea required placeholder="Message" rows={5} className="w-full px-4 py-3 border rounded-lg" value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} />
                <button type="submit" className="w-full px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold">Send</button>
              </form>
            </div>
          </div>
        );
      }
      
      function App() {
        return (
          <HashRouter>
            <Navigation />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/contact" element={<ContactPage />} />
            </Routes>
            <Footer />
          </HashRouter>
        );
      }
      
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(<App />);
    });
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

For FEATURES_PLACEHOLDER, use this format:
{[
  { icon: '⚡', title: 'Feature 1', desc: 'Description' },
  { icon: '🔒', title: 'Feature 2', desc: 'Description' },
  { icon: '🎯', title: 'Feature 3', desc: 'Description' }
].map((f, i) => (
  <div key={i} className="p-6 bg-white rounded-xl shadow-lg">
    <div className="text-4xl mb-4">{f.icon}</div>
    <h3 className="text-xl font-bold mb-2">{f.title}</h3>
    <p className="text-gray-600">{f.desc}</p>
  </div>
))}

For SERVICES_PLACEHOLDER, use this format:
{[1, 2, 3, 4].map(i => (
  <div key={i} className="p-8 bg-white rounded-xl shadow-lg">
    <h3 className="text-2xl font-bold mb-4">Service {i}</h3>
    <p className="text-gray-600 mb-6">Description</p>
    <Link to="/contact" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Learn More</Link>
  </div>
))}

USER REQUEST: "${prompt}"

Generate the complete HTML file with all placeholders replaced. Include the waitForReactRouter function - it's critical!`;

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