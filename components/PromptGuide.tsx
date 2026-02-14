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
  // ─── SIMPLE WEBSITES ────────────────────────────────────────────────────────
  {
    id: 'coffee-shop',
    title: 'Coffee Shop Website',
    category: 'simple',
    description: '5-page website with basket, auth, and online ordering',
    prompt: `Create a full multi-page website for a coffee shop called "Brew & Bean" with these SEPARATE pages:

PAGE 1 — Home (index.html):
- Full-width hero with headline "Crafted With Love, Served With Warmth", subtext, and "Order Now" CTA button
- Featured drinks section: 3 cards (Signature Latte, Cold Brew, Matcha Latte) each with image, name, description, price, "Add to Basket" button
- Customer testimonials: 3 reviews with star ratings and customer names
- Newsletter signup form (email input + subscribe button)
- Sticky navigation with logo, links to all 5 pages, and basket icon showing item count

PAGE 2 — Services (services.html):
- Full menu organised into sections: Hot Drinks, Cold Drinks, Pastries & Food, Seasonal Specials
- Each item: photo, name, brief description, price, dietary tags (vegan/gluten-free), "Add to Basket" button
- Filter buttons to show all / drinks / food / seasonal

PAGE 3 — About (about.html):
- Brand story section with large image and text
- "Meet the Team" grid: 4 team member cards with photo, name, role, fun fact
- Our Values section: 3 pillars (Quality, Community, Sustainability) with icons and descriptions
- Timeline of the coffee shop's history

PAGE 4 — Contact (contact.html):
- Contact form: name, email, subject (dropdown), message textarea, submit button
- Store info card: address, phone, email, opening hours (Mon-Fri 7am-7pm, Sat-Sun 8am-6pm)
- Google Maps embed placeholder
- Three location cards if multiple branches

PAGE 5 — Basket (basket.html) [REQUIRES LOGIN]:
- If not logged in: show login prompt and redirect to login modal
- If logged in: basket table with item name, quantity stepper, unit price, line total, remove button
- Order summary card: subtotal, delivery fee, total
- Checkout button (Stripe placeholder)
- Continue shopping link

Authentication:
- Login/Signup modal (email + password, Google OAuth button)
- User state persisted in localStorage
- Logged-in state shows user name and logout button in nav
- Basket protected — redirect to login if not authenticated

Design:
- Colour palette: deep espresso brown (#3D1A00), warm cream (#FFF8F0), burnt orange (#E87722), soft gold (#D4A853)
- Font: Playfair Display for headings, Lato for body
- Card-based layout with subtle shadows
- Hover animations on all interactive elements
- Fully mobile responsive (hamburger menu on mobile)

Technical:
- Separate HTML file per page
- Single shared styles.css with CSS custom properties
- Single shared app.js with basket state management (localStorage), auth state, nav active state
- Form validation on all forms
- Smooth page transitions`,
    tags: ['multi-page', 'basket', 'auth', 'e-commerce', 'forms', 'responsive'],
    expectedOutput: 'Files: index.html, services.html, about.html, contact.html, basket.html, styles.css, app.js',
  },
  {
    id: 'portfolio',
    title: 'Developer Portfolio',
    category: 'simple',
    description: '4-page dark portfolio with project gallery and animations',
    prompt: `Create a professional developer portfolio website with 4 separate pages:

PAGE 1 — Home (index.html):
- Animated hero: large name heading, animated typewriter tagline cycling through "Full-Stack Developer", "UI/UX Enthusiast", "Problem Solver"
- Tech stack grid: 12 skill pills with icons (React, Next.js, TypeScript, Node.js, Python, PostgreSQL, AWS, Docker, Git, Figma, Tailwind, GraphQL)
- Featured projects: 3 cards with screenshot (Picsum photo), title, 2-line description, 3 tech tags, "View Project" and "GitHub" buttons
- Stats bar: "3+ Years Experience | 20+ Projects | 5 Happy Clients | Open to Work"
- CTA section with "Download CV" and "Get in Touch" buttons

PAGE 2 — Projects (projects.html):
- Filter bar: All | Frontend | Full-Stack | Mobile | Open Source
- Masonry or grid of 8 project cards — each shows real screenshot (Picsum seed), title, description, tech stack badges, live demo link, GitHub link
- Each card has a colour-coded difficulty badge (Beginner / Intermediate / Advanced)
- "Load More" button

PAGE 3 — About (about.html):
- Professional headshot placeholder (Picsum round photo) + bio paragraph
- Work Experience timeline: 3 roles with company, title, dates, bullet points of achievements
- Education section: degree, university, graduation year
- Certifications: 3 badge-style cards
- Hobbies section with emoji icons
- Downloadable CV button (links to placeholder PDF)

PAGE 4 — Contact (contact.html):
- Headline "Let's Build Something Together"
- Contact form: name, email, subject, message, budget range dropdown, submit button
- Social links: GitHub, LinkedIn, Twitter/X, Dev.to — as large icon buttons
- Availability badge "Currently Available for Freelance"
- Response time notice "Usually responds within 24 hours"

Design:
- Dark theme: background #0A0A0F, cards #13131A, borders #1E1E2E
- Accent: electric purple #7C3AED, cyan #06B6D4
- Glassmorphism cards with backdrop-filter
- Subtle particle or grid background on hero
- Smooth fade-in animations on scroll
- Responsive with hamburger menu

Technical:
- Separate HTML files, shared dark.css, shared portfolio.js
- Intersection Observer for scroll animations
- Active nav link highlighting
- Theme toggle (dark/light)`,
    tags: ['portfolio', 'dark-theme', 'animations', 'glassmorphism', 'multi-page'],
    expectedOutput: 'Files: index.html, projects.html, about.html, contact.html, dark.css, portfolio.js',
  },

  // ─── FULL-STACK APPS ─────────────────────────────────────────────────────────
  {
    id: 'task-manager',
    title: 'Task Management App',
    category: 'full-stack',
    description: 'Full CRUD app with auth, priorities, and dashboard analytics',
    prompt: `Build a full-stack task management application:

PAGES / ROUTES:
- / — Public landing page with feature highlights and pricing comparison
- /login & /signup — Auth pages with email/password + Google OAuth
- /dashboard — Protected: task stats cards (total, completed, overdue, due today), activity chart (Recharts), quick-add form
- /tasks — Protected: full task list with table + card view toggle
- /tasks/[id] — Task detail with comments thread
- /profile — User settings, avatar upload, notification preferences

TASK FEATURES:
- Create / edit / delete tasks
- Fields: title, description, status (todo / in-progress / done / cancelled), priority (low/medium/high/urgent), due date, tags, assignee (for team use)
- Bulk actions: mark complete, delete, change priority
- Filter by status, priority, tag, due date range
- Full-text search
- Sort by due date, priority, created date
- Drag-and-drop kanban board view (optional)

NOTIFICATIONS:
- Email reminders for tasks due tomorrow (via Resend)
- In-app notification bell with unread count

TECH STACK:
- Next.js 14 App Router
- NextAuth.js (email/password + Google)
- Prisma ORM + PostgreSQL
- TypeScript
- Tailwind CSS + shadcn/ui
- Recharts for dashboard charts
- Zod for validation
- Server Actions for mutations

DATABASE SCHEMA:
- User (id, name, email, avatar, createdAt)
- Task (id, title, description, status, priority, dueDate, userId, tags, createdAt, updatedAt)
- Comment (id, taskId, userId, body, createdAt)
- Notification (id, userId, message, read, createdAt)`,
    tags: ['full-stack', 'crud', 'auth', 'kanban', 'charts', 'real-time'],
    expectedOutput: 'Complete Next.js app: app router pages, API routes, Prisma schema, components',
  },
  {
    id: 'saas-dashboard',
    title: 'SaaS Dashboard',
    category: 'full-stack',
    description: 'Multi-tenant SaaS with Stripe subscriptions and team management',
    prompt: `Build a production-ready SaaS dashboard application:

PAGES / ROUTES:
- / — Marketing landing page: hero, features, pricing (3 tiers), testimonials, FAQ, footer
- /login & /signup — Auth with Google, GitHub, email/password + email verification
- /onboarding — 3-step wizard: workspace name → invite team → choose plan
- /dashboard — KPI cards (MRR, active users, churn rate, NPS), line charts (Recharts), recent activity feed
- /settings/profile — Name, avatar, password, 2FA setup
- /settings/team — Invite members, manage roles (Owner/Admin/Member), remove members
- /settings/billing — Current plan, usage meters, upgrade/downgrade, payment history, cancel
- /settings/api-keys — Generate, name, copy, revoke API keys
- /analytics — Detailed charts: user growth, feature usage, geographic breakdown

SUBSCRIPTION (STRIPE):
- Free: 1 user, 100 API calls/day
- Pro (£29/mo): 10 users, 10,000 API calls/day, priority support
- Enterprise (£99/mo): unlimited users, unlimited API calls, SSO, dedicated support
- Webhook handler for subscription events (created, updated, cancelled, payment_failed)
- Billing portal redirect via Stripe Customer Portal

TECH STACK:
- Next.js 14 App Router
- NextAuth.js (Google + GitHub + Email)
- Prisma ORM + PostgreSQL
- Stripe (subscriptions + webhooks + billing portal)
- Resend for transactional emails
- TypeScript, Tailwind CSS + shadcn/ui
- Recharts, Zod, React Hook Form

DATABASE:
- User, Workspace, WorkspaceMember, Subscription, ApiKey, ActivityLog, Invitation tables
- Row-level data isolation per workspace`,
    tags: ['saas', 'stripe', 'multi-tenant', 'team', 'billing', 'onboarding'],
    expectedOutput: 'Full Next.js SaaS with auth, Stripe webhooks, team management, analytics',
  },
  {
    id: 'ecommerce',
    title: 'E-commerce Store',
    category: 'full-stack',
    description: 'Full-featured store with Stripe checkout and admin dashboard',
    prompt: `Build a complete e-commerce store:

PUBLIC PAGES:
- / — Hero banner, featured products (6 cards), category browsing, promotional banner, newsletter signup
- /products — Product grid with sidebar filters (category, price range, rating, in-stock toggle), search, sort (price/rating/newest)
- /products/[slug] — Image gallery (5 photos), description tabs (details/specs/reviews), related products, add-to-cart with quantity, wishlist button
- /cart — Cart items table, quantity stepper, remove, promo code input, order summary, "Proceed to Checkout" button
- /checkout — Multi-step: Shipping → Payment (Stripe Elements) → Review → Confirmation
- /orders/[id] — Order confirmation with tracking timeline
- /account — Login-protected: profile, order history, saved addresses, wishlist

ADMIN DASHBOARD (/admin — separate protected section):
- /admin/dashboard — Revenue chart, orders today, top-selling products, recent orders table
- /admin/products — CRUD: add/edit/delete products with image upload (Cloudinary), stock management
- /admin/orders — Order list, status updates (pending/processing/shipped/delivered/cancelled), print invoice
- /admin/customers — Customer list with order count, lifetime value
- /admin/analytics — Sales trends, conversion funnel, category breakdown

TECH STACK:
- Next.js 14 App Router
- NextAuth.js (customer + admin roles)
- Prisma ORM + PostgreSQL
- Stripe (checkout + webhooks)
- Cloudinary for product images
- Resend for order confirmation emails
- TypeScript, Tailwind CSS + shadcn/ui, Recharts

DATABASE:
- Product, Category, ProductImage, Cart, CartItem, Order, OrderItem, Review, Address, Wishlist tables`,
    tags: ['e-commerce', 'stripe', 'cart', 'admin', 'cloudinary', 'reviews'],
    expectedOutput: 'Full Next.js e-commerce with admin dashboard, Stripe checkout, image uploads',
  },
  {
    id: 'blog-cms',
    title: 'Blog CMS',
    category: 'full-stack',
    description: 'Public blog with admin CMS, rich editor, and SEO',
    prompt: `Create a blog CMS with public site and admin dashboard:

PUBLIC SITE:
- / — Hero with latest post, featured posts grid (6), sidebar: categories, popular tags, newsletter signup
- /blog — Paginated post list (12/page), search bar, filter by category/tag
- /blog/[slug] — Full post: featured image, author card, reading time, table of contents, rich content, social share buttons, related posts (3), comments section
- /categories/[slug] & /authors/[slug] — Filtered post lists
- /rss.xml — Auto-generated RSS feed
- /sitemap.xml — Dynamic sitemap

ADMIN DASHBOARD (/admin):
- /admin — Stats: total posts, views this month, popular posts, recent comments
- /admin/posts — Post list with status badges (Draft/Published/Scheduled), bulk actions
- /admin/posts/new & /admin/posts/[id]/edit — Full TipTap rich text editor with: headings, bold/italic, images (drag-drop), code blocks, embeds, slash commands; SEO sidebar (meta title, description, OG image, canonical URL, noindex toggle)
- /admin/media — Image library with Cloudinary upload, search, delete
- /admin/categories & /admin/tags — CRUD management
- /admin/comments — Approve/reject/delete comments, spam detection

POST FEATURES:
- Draft → Review → Published workflow
- Schedule publish for future date/time
- Revision history (last 10 versions)
- Reading time auto-calculation
- Estimated word count

TECH STACK:
- Next.js 14 App Router
- NextAuth.js (admin role)
- Prisma ORM + PostgreSQL
- TipTap editor
- Cloudinary for media
- Resend for comment notifications
- TypeScript, Tailwind CSS

DATABASE:
- Post, Author, Category, Tag, PostTag, Comment, Media, Revision tables`,
    tags: ['blog', 'cms', 'rich-text', 'tiptap', 'seo', 'media', 'cloudinary'],
    expectedOutput: 'Complete blog CMS with public site, admin editor, media library, RSS/sitemap',
  },

  // ─── ADVANCED / AI APPS ──────────────────────────────────────────────────────
  {
    id: 'ai-fitness-coach',
    title: 'AI Fitness & Nutrition Coach',
    category: 'advanced',
    description: 'Health tech app with AI workout/meal plans, chat coach, and Stripe subscriptions',
    prompt: `Build a full-stack AI Fitness & Nutrition Coach web application.

TREND: Health tech + personalised AI — growing market with strong subscription monetisation.

PAGES / ROUTES:
- / — Marketing landing: hero video background, feature highlights, before/after testimonials, pricing, FAQ
- /login & /signup — Email/password + Google OAuth, email verification
- /onboarding — 4-step wizard: (1) personal stats (age, height, weight, gender), (2) fitness goal (weight loss/muscle gain/endurance/flexibility), (3) experience level + available equipment, (4) dietary preferences (vegan/vegetarian/keto/standard) + allergies
- /dashboard — Welcome banner, today's workout card, calorie progress ring, streak counter, macro summary, upcoming reminders, AI tip of the day
- /workout-plan — Weekly plan grid (7 days), each day shows: exercise cards with sets/reps/rest/video placeholder, swap exercise button, mark complete checkbox, XP reward animation
- /meal-plan — 7-day meal plan with breakfast/lunch/dinner/snacks, macro breakdown per meal, calorie total, grocery list generator, swap meal button
- /progress — Charts: weight trend (line), body measurements (radar), workout completion rate (bar), streak calendar (heatmap); log new entry form; milestone badges
- /chat — Full-screen AI Chat Coach interface: conversation history, typing indicator, quick prompt chips ("Motivate me", "Adjust my plan", "What should I eat?"), voice input button, message timestamp, Claude API streaming responses
- /reminders — Habit reminder setup: workout time, meal prep reminder, water intake alerts, sleep target; notification preferences (email/push)
- /wearables — Integration cards: Fitbit, Apple Health, Garmin, Google Fit — each with "Connect" OAuth button and sync status; last sync timestamp
- /settings — Profile, goals update, unit preferences (metric/imperial), notification settings, data export, delete account
- /billing — Current plan display, usage stats (AI requests used), upgrade/downgrade plan, payment history, cancel subscription

AI FEATURES (Claude API — claude-sonnet-4-5-20250929):
- Onboarding → generate personalised 4-week workout program using structured output
- Onboarding → generate 7-day meal plan matching calorie/macro targets using structured output
- Chat Coach — streaming conversational responses for motivation, plan adjustments, nutrition questions
- Weekly plan regeneration based on progress data
- Smart swap: suggest alternative exercises/meals based on constraints

MONETISATION (Stripe):
- Free: 1 AI plan generation, 5 chat messages/month, basic tracking
- Pro (£9.99/mo): unlimited plan regeneration, 100 chat messages/month, wearable sync, meal grocery list
- Elite (£19.99/mo): unlimited everything, priority AI, human coach booking placeholder, advanced analytics
- Feature gates enforced server-side; upgrade prompts in UI when limit reached
- Stripe webhook: handle subscription.created, updated, cancelled, payment_failed

TECH STACK:
- Next.js 14 App Router
- NextAuth.js (email/password + Google)
- Prisma ORM + PostgreSQL
- Anthropic SDK (claude-sonnet-4-5-20250929) for AI features
- Stripe for subscriptions + webhooks
- Resend for email notifications
- Recharts for progress charts
- TypeScript, Tailwind CSS + shadcn/ui
- Zod for validation, React Hook Form

DATABASE SCHEMA:
- User (id, name, email, age, height, weight, goal, level, dietaryPreference, createdAt)
- WorkoutPlan (id, userId, weekStart, planData JSON, generatedAt)
- WorkoutDay (id, planId, dayOfWeek, exercises JSON, completed, completedAt)
- MealPlan (id, userId, weekStart, planData JSON, dailyCalories, generatedAt)
- ProgressEntry (id, userId, date, weight, bodyFat, notes, measurements JSON)
- ChatMessage (id, userId, role, content, createdAt)
- Reminder (id, userId, type, time, enabled)
- Subscription (id, userId, stripeCustomerId, stripePriceId, status, currentPeriodEnd)
- WearableConnection (id, userId, provider, accessToken, lastSync)`,
    tags: ['ai', 'health-tech', 'claude-api', 'stripe', 'subscriptions', 'charts', 'chat', 'wearables'],
    expectedOutput: 'Full Next.js AI app with Claude chat, Stripe subscriptions, workout/meal AI generation, progress charts',
  },
];

const BEST_PRACTICES = [
  {
    title: 'Name Every Page Explicitly',
    icon: Layers,
    description: 'List each page by name and describe exactly what sections/components it contains. The more specific, the better the output.',
    example: '❌ Vague:\n"Create a website for my coffee shop"\n\n✅ Specific:\n"Create 5 pages: (1) Home — hero, 3 featured drinks, testimonials, newsletter. (2) Services — full menu with prices. (3) About — team photos, brand story. (4) Contact — form, opening hours, map. (5) Basket — cart items, quantities, checkout (requires login)"',
  },
  {
    title: 'Specify Tech Stack Explicitly',
    icon: FileCode,
    description: 'Name the exact frameworks, libraries, and services. The AI will use what you specify — override defaults by naming them.',
    example: '✅ Good:\n"Next.js 14 App Router, NextAuth.js (email + Google), Prisma + PostgreSQL, Stripe for payments, Tailwind CSS + shadcn/ui, TypeScript, Zod for validation"\n\n✅ For AI apps:\n"Anthropic Claude API (claude-sonnet-4-5-20250929) for chat, streaming responses, structured JSON output"',
  },
  {
    title: 'Define the Design System',
    icon: Sparkles,
    description: 'Give exact colours (hex codes), fonts, layout style, and UI mood. This eliminates generic blue-and-white outputs.',
    example: '✅ Good:\n"Colour palette: espresso brown #3D1A00, warm cream #FFF8F0, burnt orange #E87722. Font: Playfair Display headings, Lato body. Style: cozy café aesthetic, card-based with subtle drop shadows, smooth hover animations, fully mobile responsive with hamburger menu"',
  },
  {
    title: 'Define Features with Behaviour',
    icon: Zap,
    description: 'Describe what each feature does, not just its name. Include edge cases, validation rules, and user flows.',
    example: '❌ Vague:\n"Add user accounts"\n\n✅ Specific:\n"Authentication: email/password signup + Google OAuth. Protected routes redirect unauthenticated users to /login. User avatar shown in nav when logged in. Logout clears session and redirects to /"',
  },
  {
    title: 'Define the Database Schema',
    icon: BookOpen,
    description: 'List your main tables and key fields. This ensures relationships are correct and the AI doesn\'t guess your data model.',
    example: '✅ Good:\n"Database tables:\n- User (id, name, email, avatar, createdAt)\n- Task (id, title, status, priority, dueDate, userId)\n- Comment (id, taskId, userId, body, createdAt)\nRelationships: Task belongs to User, Comment belongs to Task and User"',
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
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'simple', label: 'Simple Website' },
                    { value: 'full-stack', label: 'Full-Stack App' },
                    { value: 'advanced', label: '⚡ Advanced / AI' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setSelectedCategory(value)}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        selectedCategory === value
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
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
        <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap font-medium ${
          example.category === 'simple'
            ? 'bg-green-100 text-green-700'
            : example.category === 'advanced'
            ? 'bg-orange-100 text-orange-700'
            : 'bg-blue-100 text-blue-700'
        }`}>
          {example.category === 'simple' ? 'Simple' : example.category === 'advanced' ? '⚡ Advanced' : 'Full-Stack'}
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
