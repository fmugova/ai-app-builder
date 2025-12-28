import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import Anthropic from "@anthropic-ai/sdk"
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

    // ✅ FIXED: Enhanced system prompt with correct CDN URLs
    const systemPrompt = `You are an expert React developer creating production-ready single-page applications.

CRITICAL REQUIREMENTS - FOLLOW EXACTLY:

1. TECHNOLOGY STACK:
   - React 18 via CDN (production build)
   - React Router 6 with HashRouter (for iframe compatibility)
   - Tailwind CSS via CDN
   - Babel Standalone for JSX compilation
   - NO build step required - everything runs in browser

2. SITE STRUCTURE - MUST INCLUDE ALL:
   - Home page (/) - Hero section, features, CTA
   - About page (/about) - Company/project info, mission, team
   - Services page (/services) - Product/service offerings
   - Contact page (/contact) - Contact form with validation

3. NAVIGATION - MUST BE FUNCTIONAL:
   - Sticky navigation bar at top
   - Desktop menu with links
   - Mobile hamburger menu (collapsible)
   - Active link highlighting
   - Smooth transitions between pages

4. RESPONSIVE DESIGN:
   - Mobile-first approach
   - Breakpoints: sm, md, lg, xl
   - Hamburger menu for mobile
   - Touch-friendly buttons (min 44px)
   - Responsive images and layouts

5. UI COMPONENTS REQUIRED:
   - Professional navigation with logo
   - Hero section with CTA buttons
   - Feature cards/sections
   - Contact form with proper inputs
   - Footer with BuildFlow badge

6. INTERACTIVITY:
   - Working form submission (console.log for demo)
   - Mobile menu toggle functionality
   - Hover effects on buttons/links
   - Smooth page transitions
   - Active link states

EXACT TEMPLATE TO FOLLOW:

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Professional website built with BuildFlow AI">
  <title>{{SITE_TITLE}}</title>
  
  <!-- CDN Scripts - CRITICAL: Load in this exact order -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/react-router-dom@6/dist/umd/react-router-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  
  <style>
    /* Custom animations */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .fade-in {
      animation: fadeIn 0.6s ease-out;
    }
  </style>
</head>
<body class="antialiased">
  <div id="root"></div>
  
  <script type="text/babel">
    // CRITICAL: Access React Router from window (CDN exposes it globally)
    const { HashRouter, Routes, Route, Link, useLocation } = window.ReactRouterDOM || {};
    const { useState, useEffect } = React;
    
    // Safety check
    if (!HashRouter) {
      document.getElementById('root').innerHTML = '<div style="padding: 20px; text-align: center;">Loading React Router...</div>';
      throw new Error('React Router not loaded');
    }
    
    // ==========================================
    // NAVIGATION COMPONENT (REQUIRED)
    // ==========================================
    function Navigation() {
      const [isOpen, setIsOpen] = useState(false);
      const [isScrolled, setIsScrolled] = useState(false);
      const location = useLocation();
      
      useEffect(() => {
        setIsOpen(false);
      }, [location]);
      
      useEffect(() => {
        const handleScroll = () => {
          setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
      }, []);
      
      const navLinks = [
        { to: '/', label: 'Home' },
        { to: '/about', label: 'About' },
        { to: '/services', label: 'Services' },
        { to: '/contact', label: 'Contact' },
      ];
      
      return (
        <nav className={\`fixed top-0 left-0 right-0 z-50 transition-all duration-300 \${
          isScrolled ? 'bg-white shadow-lg' : 'bg-white/95 backdrop-blur-sm'
        }\`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg"></div>
                <span className="text-xl font-bold text-gray-900">{{BRAND_NAME}}</span>
              </Link>
              
              <div className="hidden md:flex items-center space-x-8">
                {navLinks.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={\`text-gray-700 hover:text-blue-600 transition-colors font-medium \${
                      location.pathname === link.to ? 'text-blue-600' : ''
                    }\`}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  to="/contact"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Get Started
                </Link>
              </div>
              
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden p-2 text-gray-700 hover:text-blue-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
            
            {isOpen && (
              <div className="md:hidden py-4 border-t border-gray-200">
                <div className="flex flex-col space-y-3">
                  {navLinks.map(link => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={\`px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg \${
                        location.pathname === link.to ? 'bg-blue-50 text-blue-600' : ''
                      }\`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>
      );
    }
    
    // ==========================================
    // HOME PAGE
    // ==========================================
    function HomePage() {
      return (
        <div className="min-h-screen pt-16">
          <section className="bg-gradient-to-br from-blue-50 to-purple-50 py-20 fade-in">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                {{HERO_HEADLINE}}
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                {{HERO_SUBTEXT}}
              </p>
              <Link
                to="/contact"
                className="inline-block px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-semibold"
              >
                Get Started
              </Link>
            </div>
          </section>
          
          <section className="py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">Features</h2>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { icon: '⚡', title: 'Fast', desc: 'Lightning-fast performance' },
                  { icon: '🔒', title: 'Secure', desc: 'Enterprise-grade security' },
                  { icon: '🎯', title: 'Reliable', desc: '99.9% uptime' },
                ].map((f, i) => (
                  <div key={i} className="p-6 bg-white rounded-xl shadow-lg">
                    <div className="text-4xl mb-4">{f.icon}</div>
                    <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                    <p className="text-gray-600">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      );
    }
    
    // ==========================================
    // OTHER PAGES (simplified for brevity)
    // ==========================================
    function AboutPage() {
      return (
        <div className="min-h-screen pt-16 py-20 fade-in">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-5xl font-bold mb-8">About Us</h1>
            <p className="text-xl text-gray-600">{{ABOUT_TEXT}}</p>
          </div>
        </div>
      );
    }
    
    function ServicesPage() {
      return (
        <div className="min-h-screen pt-16 py-20 fade-in">
          <div className="max-w-7xl mx-auto px-4">
            <h1 className="text-5xl font-bold text-center mb-12">Our Services</h1>
            <div className="grid md:grid-cols-2 gap-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="p-8 bg-white rounded-xl shadow-lg">
                  <h3 className="text-2xl font-bold mb-4">Service {i}</h3>
                  <p className="text-gray-600 mb-6">Professional service description</p>
                  <Link to="/contact" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Learn More
                  </Link>
                </div>
              ))}
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
        console.log('Form submitted:', formData);
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 3000);
      };
      
      return (
        <div className="min-h-screen pt-16 py-20 fade-in">
          <div className="max-w-2xl mx-auto px-4">
            <h1 className="text-5xl font-bold text-center mb-12">Contact Us</h1>
            {submitted && (
              <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg">
                Thank you! We'll get back to you soon.
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <input
                type="text"
                required
                placeholder="Name"
                className="w-full px-4 py-3 border rounded-lg"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
              <input
                type="email"
                required
                placeholder="Email"
                className="w-full px-4 py-3 border rounded-lg"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
              <textarea
                required
                placeholder="Message"
                rows={5}
                className="w-full px-4 py-3 border rounded-lg"
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
              />
              <button
                type="submit"
                className="w-full px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      );
    }
    
    // ==========================================
    // FOOTER
    // ==========================================
    function Footer() {
      return (
        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-gray-400 mb-2">© 2025 {{BRAND_NAME}}. All rights reserved.</p>
            <p className="text-sm">
              ⚡ Built with{' '}
              <a href="https://buildflow-ai.app" target="_blank" className="text-blue-400 hover:text-blue-300 font-semibold">
                BuildFlow AI
              </a>
            </p>
          </div>
        </footer>
      );
    }
    
    // ==========================================
    // MAIN APP
    // ==========================================
    function App() {
      return (
        <HashRouter>
          <div className="min-h-screen bg-gray-50">
            <Navigation />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/contact" element={<ContactPage />} />
            </Routes>
            <Footer />
          </div>
        </HashRouter>
      );
    }
    
    // ==========================================
    // RENDER
    // ==========================================
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>

INSTRUCTIONS:
1. Replace {{PLACEHOLDERS}} with content based on user request
2. Customize all text, colors, and sections
3. Add industry-specific features
4. Keep all 4 pages functional
5. Ensure mobile responsive
6. DO NOT remove core functionality

USER REQUEST: Create a professional ${type} website about "${prompt}"

Generate the complete HTML file with all pages working.`;

    console.log('Calling Claude API...');

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

    let code = '';
    if (message.content && message.content[0]) {
      const content = message.content[0];
      code = content.type === 'text' ? content.text : '';
    } else {
      console.error('Unexpected Claude response:', message);
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

    console.log('Code generated successfully, updating user stats...');

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

    console.log('Generation completed successfully');

    return NextResponse.json({ code })

  } catch (error: any) {
    console.error('Generate error:', error)

    if (error?.error?.type === 'overloaded_error') {
      return NextResponse.json(
        {
          error: 'Claude is experiencing high demand. Please try again in a moment.',
          retryable: true
        },
        { status: 503 }
      );
    }

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