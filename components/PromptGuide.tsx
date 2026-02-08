'use client';

import { useState } from 'react';
import { Search, BookOpen, Sparkles, FileCode, Layers, Zap, X } from 'lucide-react';

interface PromptExample {
  id: string;
  title: string;
  category: 'simple' | 'full-stack' | 'advanced';
  description: string;
  prompt: string;
  tags: string[];
  expectedOutput: string;
}

const PROMPT_EXAMPLES: PromptExample[] = [
  {
    id: 'coffee-landing',
    title: 'Coffee Shop Landing Page',
    category: 'simple',
    description: 'Multi-page marketing website for a coffee shop',
    prompt: `Create a professional landing page for a coffee shop called "Brew & Bean" with the following pages:

1. Home page with:
   - Hero section with call-to-action
   - Featured products grid (3 items)
   - About section
   - Contact information

2. Menu page with:
   - Coffee drinks section
   - Pastries section
   - Prices for each item

3. Contact page with:
   - Contact form (name, email, message)
   - Store hours
   - Location map placeholder

Design Requirements:
- Warm, inviting color scheme (browns, creams, warm oranges)
- Modern, clean layout
- Responsive mobile design
- Professional typography
- Navigation menu on all pages

Technical Requirements:
- Separate HTML file for each page
- Shared CSS file for consistent styling
- Proper semantic HTML
- Form validation
- Mobile-first responsive design`,
    tags: ['landing-page', 'multi-page', 'forms', 'responsive'],
    expectedOutput: 'Separate files: index.html, menu.html, contact.html, styles.css',
  },
  {
    id: 'task-manager',
    title: 'Task Management App',
    category: 'full-stack',
    description: 'Complete CRUD application with authentication',
    prompt: `Build a full-stack task management application with these features:

Authentication:
- Email/password signup and login
- Protected routes
- User profile page

Task Management:
- Create, read, update, delete tasks
- Task properties: title, description, status (todo/in-progress/done), due date, priority
- Filter tasks by status and priority
- Search tasks by title
- Sort tasks by due date or priority

Pages:
- Landing page (public)
- Login/Signup pages
- Dashboard (shows task summary)
- Task list page with filters
- Task detail/edit page
- User profile page

Tech Stack:
- Next.js 14 with App Router
- Supabase for auth and database
- Prisma ORM
- TypeScript
- Tailwind CSS + shadcn/ui components
- Server actions for mutations

Database Schema:
- Users table (managed by Supabase Auth)
- Tasks table with user_id foreign key
- Implement Row Level Security`,
    tags: ['full-stack', 'crud', 'authentication', 'database'],
    expectedOutput: 'Complete Next.js app with multiple routes, API routes, database schema',
  },
  {
    id: 'portfolio',
    title: 'Developer Portfolio',
    category: 'simple',
    description: 'Personal portfolio website with project showcase',
    prompt: `Create a developer portfolio website with:

Home Page:
- Hero section with name and tagline
- Skills section (display programming languages and tools)
- Featured projects (3 project cards)
- Contact CTA

Projects Page:
- Grid of project cards
- Each card shows: title, description, tech stack, live demo link, GitHub link
- Filter by technology
- Projects data can be hardcoded for now

About Page:
- Professional bio
- Work experience timeline
- Education
- Downloadable resume button

Contact Page:
- Contact form with name, email, message
- Social media links (GitHub, LinkedIn, Twitter)
- Email address

Design:
- Dark theme by default
- Modern, minimal aesthetic
- Smooth animations and transitions
- Code syntax highlighting for any code snippets
- Responsive design

Technical:
- Separate HTML files for each page
- Shared CSS with CSS custom properties for theming
- Optional: Add theme toggle (light/dark)`,
    tags: ['portfolio', 'showcase', 'dark-theme', 'animations'],
    expectedOutput: 'Multi-page website with index.html, projects.html, about.html, contact.html',
  },
  {
    id: 'saas-dashboard',
    title: 'SaaS Dashboard',
    category: 'full-stack',
    description: 'Complete SaaS application with subscriptions',
    prompt: `Build a SaaS dashboard application with subscription management:

Authentication & Onboarding:
- Email/password and social login (Google)
- Email verification
- Onboarding wizard for new users

Dashboard:
- Overview with key metrics (cards/charts)
- Recent activity feed
- Quick actions

Subscription Management:
- Stripe integration with 3 tiers (Free, Pro, Enterprise)
- Billing page showing current plan
- Upgrade/downgrade functionality
- Payment history

User Management:
- Profile settings
- Account settings
- Team members (for higher tiers)
- API keys management

Tech Stack:
- Next.js 14 with App Router
- Supabase (auth, database, storage)
- Stripe for payments
- Prisma ORM
- TypeScript
- Tailwind CSS + shadcn/ui
- Recharts for data visualization

Database:
- Users table
- Subscriptions table
- API keys table
- Activity logs table
- Implement Row Level Security

Features:
- Usage tracking and limits based on plan
- Email notifications for important events
- Export data functionality`,
    tags: ['saas', 'stripe', 'subscriptions', 'dashboard', 'charts'],
    expectedOutput: 'Full Next.js application with auth, payments, multiple routes',
  },
  {
    id: 'blog-cms',
    title: 'Blog CMS',
    category: 'full-stack',
    description: 'Content management system for blog posts',
    prompt: `Create a blog CMS with:

Public Pages:
- Home page with featured posts
- Blog list page with pagination
- Individual blog post pages
- Category pages
- Author pages
- Search functionality

Admin Dashboard:
- Post list (draft, published, scheduled)
- Rich text editor for creating/editing posts
- Media library for images
- Categories management
- Tags management
- SEO settings per post

Post Features:
- Draft/publish workflow
- Schedule posts for future
- Featured image
- Categories and tags
- Author attribution
- Reading time estimate
- Related posts
- Comments section

Tech Stack:
- Next.js 14 with App Router
- Supabase (auth, database, storage)
- Prisma ORM
- TipTap or Lexical for rich text editing
- TypeScript
- Tailwind CSS

Database Schema:
- Users (authors)
- Posts (title, slug, content, status, published_at)
- Categories
- Tags
- Media (uploaded images)
- Comments

SEO:
- Dynamic meta tags per post
- Open Graph images
- Sitemap generation
- RSS feed`,
    tags: ['cms', 'blog', 'rich-text', 'seo', 'media'],
    expectedOutput: 'Complete blog CMS with public site and admin dashboard',
  },
  {
    id: 'ecommerce',
    title: 'E-commerce Store',
    category: 'full-stack',
    description: 'Online store with cart and checkout',
    prompt: `Create an e-commerce store with:

Product Catalog:
- Product listing page with filters (category, price, rating)
- Search functionality
- Product detail pages with image gallery
- Related products
- Product reviews and ratings

Shopping Cart:
- Add to cart functionality
- Update quantities
- Remove items
- Cart summary
- Persistent cart (save to database)

Checkout:
- Multi-step checkout process
- Shipping information form
- Payment integration (Stripe)
- Order summary
- Order confirmation page

User Features:
- User authentication
- Order history
- Wishlist
- Profile management

Admin Dashboard:
- Product management (CRUD)
- Order management
- Customer list
- Sales analytics

Tech Stack:
- Next.js 14 with App Router
- Supabase (auth, database)
- Stripe for payments
- Prisma ORM
- TypeScript
- Tailwind CSS

Database:
- Products, Categories, Orders, OrderItems, Reviews tables`,
    tags: ['ecommerce', 'stripe', 'cart', 'checkout'],
    expectedOutput: 'Full e-commerce application with product catalog, cart, and checkout',
  },
];

const BEST_PRACTICES = [
  {
    title: 'Be Specific About Pages',
    icon: Layers,
    description: 'List every page you want and what should be on each page',
    example: 'Instead of: "Create a website for my business"\nWrite: "Create a website with: Home page (hero, services, testimonials), About page (team, history), Services page (list of services with pricing), Contact page (form, map, hours)"',
  },
  {
    title: 'Specify Technical Requirements',
    icon: FileCode,
    description: 'Mention tech stack, frameworks, and styling preferences',
    example: 'Include: "Use Tailwind CSS, Next.js App Router, TypeScript, Supabase for backend, implement Row Level Security"',
  },
  {
    title: 'Describe the Design',
    icon: Sparkles,
    description: 'Mention colors, layout style, and design aesthetic',
    example: 'Include: "Modern minimal design, blue and white color scheme, card-based layout, smooth animations, mobile-first responsive"',
  },
  {
    title: 'Define Features Clearly',
    icon: Zap,
    description: 'Break down each feature with specific behavior',
    example: 'Instead of: "Add user accounts"\nWrite: "User authentication with email/password, profile page where users can update name and avatar, password reset flow via email"',
  },
];

interface PromptGuideProps {
  onSelectExample?: (prompt: string) => void;
}

export default function PromptGuide({ onSelectExample }: PromptGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'examples' | 'tips'>('examples');

  const filteredExamples = PROMPT_EXAMPLES.filter(example => {
    const matchesSearch = 
      example.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      example.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      example.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = 
      selectedCategory === 'all' || example.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleUseExample = (prompt: string) => {
    if (onSelectExample) {
      onSelectExample(prompt);
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <BookOpen className="h-4 w-4" />
        Prompt Guide
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Prompt Writing Guide</h2>
            <p className="text-sm text-gray-600 mt-1">
              Learn how to write effective prompts to generate exactly what you need
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('examples')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'examples'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Examples
            </button>
            <button
              onClick={() => setActiveTab('tips')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'tips'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Best Practices
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          {activeTab === 'examples' ? (
            <div className="space-y-4 h-full flex flex-col">
              {/* Search and Filter */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search examples..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      selectedCategory === 'all'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setSelectedCategory('simple')}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      selectedCategory === 'simple'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Simple Website
                  </button>
                  <button
                    onClick={() => setSelectedCategory('full-stack')}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      selectedCategory === 'full-stack'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Full-Stack App
                  </button>
                </div>
              </div>

              {/* Examples List */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {filteredExamples.map((example) => (
                  <ExampleCard
                    key={example.id}
                    example={example}
                    onUse={handleUseExample}
                  />
                ))}
                {filteredExamples.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No examples found matching your search.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto space-y-6 pr-2">
              {BEST_PRACTICES.map((practice, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <practice.icon className="h-5 w-5 text-purple-600" />
                    <h4 className="font-semibold text-gray-900">{practice.title}</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    {practice.description}
                  </p>
                  <div className="bg-gray-50 p-3 rounded text-xs font-mono whitespace-pre-wrap text-gray-700 border border-gray-200">
                    {practice.example}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExampleCard({ 
  example, 
  onUse 
}: { 
  example: PromptExample; 
  onUse: (prompt: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3 hover:border-purple-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">{example.title}</h4>
          <p className="text-sm text-gray-600">{example.description}</p>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
          example.category === 'simple'
            ? 'bg-green-100 text-green-700'
            : 'bg-blue-100 text-blue-700'
        }`}>
          {example.category === 'simple' ? 'Simple' : 'Full-Stack'}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {example.tags.map((tag) => (
          <span 
            key={tag} 
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded border border-gray-200"
          >
            {tag}
          </span>
        ))}
      </div>

      {isExpanded && (
        <div className="space-y-2">
          <div className="bg-gray-50 p-3 rounded text-xs max-h-48 overflow-y-auto whitespace-pre-wrap font-mono text-gray-700 border border-gray-200">
            {example.prompt}
          </div>
          <p className="text-xs text-gray-600">
            <strong>Expected Output:</strong> {example.expectedOutput}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {isExpanded ? 'Hide' : 'View'} Prompt
        </button>
        <button
          onClick={() => onUse(example.prompt)}
          className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Use This Prompt
        </button>
      </div>
    </div>
  );
}
