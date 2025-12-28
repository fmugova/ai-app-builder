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

    const systemPrompt = `You are an expert React developer creating production-ready single-page applications.

CRITICAL REQUIREMENTS - YOU MUST INCLUDE ALL OF THESE:

1. **NAVIGATION COMPONENT** - REQUIRED at the top of EVERY page:
   - Logo/brand name on left
   - Links: Home, About, Services, Contact
   - Mobile hamburger menu
   - Sticky/fixed positioning
   
2. **FOOTER COMPONENT** - REQUIRED at the bottom:
   - Must include: "⚡ Built with BuildFlow AI" with link to https://buildflow-ai.app
   - Copyright text
   - Social links or additional info
   
3. **4 COMPLETE PAGES** - All functional with HashRouter:
   - Home page (hero, features, CTA)
   - About page (company info, team)
   - Services page (service cards)
   - Contact page (working form with useState)

TEMPLATE STRUCTURE (USE EXACTLY THIS):

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{SITE_TITLE}}</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script crossorigin src="https://cdn.jsdelivr.net/npm/react-router-dom@6.20.1/dist/umd/react-router-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in { animation: fadeIn 0.6s ease-out; }
  </style>
</head>
<body>
  <div id="root"></div>
  
  <script type="text/babel">
    const { HashRouter, Routes, Route, Link, useLocation } = window.ReactRouterDOM;
    const { useState, useEffect } = React;
    
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
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
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
                {navLinks.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={\`block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg \${
                      location.pathname === link.to ? 'bg-blue-50 text-blue-600' : ''
                    }\`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>
      );
    }
    
    // ==========================================
    // FOOTER COMPONENT (REQUIRED WITH BUILDFLOW BRANDING)
    // ==========================================
    function Footer() {
      return (
        <footer className="bg-gray-900 text-white py-12 mt-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center">
              <p className="text-gray-400 mb-2">© 2025 {{BRAND_NAME}}. All rights reserved.</p>
              <p className="text-sm">
                ⚡ Built with{' '}
                <a 
                  href="https://buildflow-ai.app" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 font-semibold"
                >
                  BuildFlow AI
                </a>
              </p>
            </div>
          </div>
        </footer>
      );
    }
    
    // ==========================================
    // HOME PAGE (REQUIRED)
    // ==========================================
    function HomePage() {
      return (
        <div className="min-h-screen">
          <section className="bg-gradient-to-br from-blue-50 to-purple-50 py-32 mt-16 fade-in">
            <div className="max-w-7xl mx-auto px-4 text-center">
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
            <div className="max-w-7xl mx-auto px-4">
              <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">Features</h2>
              <div className="grid md:grid-cols-3 gap-8">
                {{FEATURES}}
              </div>
            </div>
          </section>
        </div>
      );
    }
    
    // ==========================================
    // ABOUT PAGE (REQUIRED)
    // ==========================================
    function AboutPage() {
      return (
        <div className="min-h-screen pt-24 py-20 fade-in">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-5xl font-bold mb-8">About Us</h1>
            <div className="prose prose-lg">
              {{ABOUT_CONTENT}}
            </div>
          </div>
        </div>
      );
    }
    
    // ==========================================
    // SERVICES PAGE (REQUIRED)
    // ==========================================
    function ServicesPage() {
      return (
        <div className="min-h-screen pt-24 py-20 fade-in">
          <div className="max-w-7xl mx-auto px-4">
            <h1 className="text-5xl font-bold text-center mb-12">Our Services</h1>
            <div className="grid md:grid-cols-2 gap-8">
              {{SERVICES}}
            </div>
          </div>
        </div>
      );
    }
    
    // ==========================================
    // CONTACT PAGE (REQUIRED WITH FORM)
    // ==========================================
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
        <div className="min-h-screen pt-24 py-20 fade-in">
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
    // MAIN APP (REQUIRED)
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
    // RENDER (REQUIRED)
    // ==========================================
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>
\`\`\`

INSTRUCTIONS:
1. Replace {{BRAND_NAME}} with appropriate brand name based on prompt
2. Replace {{HERO_HEADLINE}} and {{HERO_SUBTEXT}} with compelling copy
3. Replace {{FEATURES}} with 3 feature cards (use the template below)
4. Replace {{ABOUT_CONTENT}} with paragraphs about the company
5. Replace {{SERVICES}} with 4 service cards
6. Customize colors, images, and content for the specific industry
7. NEVER remove Navigation or Footer components
8. ALWAYS include BuildFlow AI branding in footer

FEATURE CARD TEMPLATE:
\`\`\`jsx
{[
  { icon: '⚡', title: 'Feature 1', desc: 'Description' },
  { icon: '🔒', title: 'Feature 2', desc: 'Description' },
  { icon: '🎯', title: 'Feature 3', desc: 'Description' },
].map((f, i) => (
  <div key={i} className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition">
    <div className="text-4xl mb-4">{f.icon}</div>
    <h3 className="text-xl font-bold mb-2">{f.title}</h3>
    <p className="text-gray-600">{f.desc}</p>
  </div>
))}
\`\`\`

SERVICE CARD TEMPLATE:
\`\`\`jsx
{[1, 2, 3, 4].map(i => (
  <div key={i} className="p-8 bg-white rounded-xl shadow-lg">
    <h3 className="text-2xl font-bold mb-4">Service {i}</h3>
    <p className="text-gray-600 mb-6">Description</p>
    <Link to="/contact" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
      Learn More
    </Link>
  </div>
))}
\`\`\`

USER REQUEST: Create a professional ${type} website about "${prompt}"

Generate the complete HTML file following the template exactly.`;

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