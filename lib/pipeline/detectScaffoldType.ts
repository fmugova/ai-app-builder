// lib/pipeline/detectScaffoldType.ts
// Replaces the two inline isAppPrompt() / isEcommercePrompt()
// functions in htmlGenerationPipeline.ts with a proper ranked
// scaffold classifier.

export type ScaffoldType =
  | 'ecommerce'
  | 'app'
  | 'restaurant'
  | 'saas'
  | 'portfolio'
  | 'blog'
  | 'event'
  | 'professional'
  | 'generic';

// ── Keyword lists ────────────────────────────────────────────────────────────

const ECOMMERCE_KEYWORDS = [
  'shop', 'store', 'ecommerce', 'e-commerce', 'product', 'products',
  'cart', 'basket', 'checkout', 'buy', 'purchase', 'order', 'orders',
  'marketplace', 'catalogue', 'catalog', 'merchandise', 'retail',
  'shipping', 'promo code', 'discount', 'coupon', 'inventory',
  'add to bag', 'add to cart', 'wishlist', 'storefront',
];

const APP_KEYWORDS = [
  'task', 'todo', 'to-do', 'kanban', 'board',
  'note', 'notes', 'note-taking',
  'calculator', 'converter', 'currency converter', 'unit converter',
  'timer', 'stopwatch', 'countdown', 'pomodoro',
  'quiz', 'game', 'puzzle', 'trivia', 'flashcard',
  'tracker', 'habit', 'budget', 'expense', 'finance tracker',
  'calendar', 'planner', 'scheduler', 'appointment',
  'poll', 'vote', 'survey', 'form builder',
  'crud', 'admin panel', 'data management',
  'chat app', 'messaging app',
  'weather app', 'news app',
  'productivity app', 'tool', 'utility',
];

const RESTAURANT_KEYWORDS = [
  'restaurant', 'cafe', 'café', 'bistro', 'brasserie', 'eatery',
  'bar', 'pub', 'gastropub', 'diner', 'deli', 'bakery', 'patisserie',
  'pizzeria', 'sushi', 'takeaway', 'takeout', 'food delivery',
  'menu', 'reservation', 'book a table', 'book table',
  'catering', 'food truck', 'street food', 'fine dining',
  'brunch', 'breakfast spot', 'coffee shop', 'tea room',
];

const SAAS_KEYWORDS = [
  'saas', 'software', 'platform', 'app startup', 'startup',
  'free trial', 'pricing', 'subscription', 'sign up', 'waitlist',
  'sign-up', 'onboarding', 'dashboard app', 'web app',
  'api', 'developer tool', 'devtools', 'sdk', 'integration',
  'crm', 'erp', 'analytics platform', 'reporting tool',
  'project management', 'team collaboration', 'workflow',
  'b2b', 'enterprise', 'saas landing', 'product landing',
  'feature comparison', 'plans and pricing',
];

const PORTFOLIO_KEYWORDS = [
  'portfolio', 'agency', 'creative', 'studio', 'design studio',
  'freelance', 'freelancer', 'showcase', 'case study', 'case studies',
  'photographer', 'photography', 'videographer', 'filmmaker',
  'graphic designer', 'web designer', 'illustrator', 'artist',
  'architect', 'architecture firm', 'interior designer',
  'my work', 'our work', 'projects showcase', 'creative work',
  'branding agency', 'marketing agency', 'digital agency',
];

const BLOG_KEYWORDS = [
  'blog', 'articles', 'posts', 'newsletter', 'publication',
  'magazine', 'editorial', 'news site', 'journal', 'diary',
  'content site', 'writing', 'author', 'writer',
  'recipes blog', 'travel blog', 'personal blog',
  'tech blog', 'company blog', 'insights', 'thought leadership',
];

const EVENT_KEYWORDS = [
  'event', 'conference', 'summit', 'meetup', 'workshop',
  'webinar', 'hackathon', 'festival', 'concert', 'gig',
  'exhibition', 'expo', 'trade show', 'launch event',
  'countdown', 'tickets', 'register to attend', 'schedule', 'agenda',
  'speakers', 'sponsors', 'venue', 'rsvp',
];

const PROFESSIONAL_KEYWORDS = [
  'law firm', 'lawyer', 'solicitor', 'barrister', 'legal',
  'accountant', 'accounting firm', 'chartered accountant',
  'consultant', 'consultancy', 'consulting firm',
  'financial advisor', 'wealth management', 'financial planning',
  'doctor', 'dentist', 'clinic', 'medical practice', 'therapy',
  'recruitment', 'hr agency', 'staffing',
  'estate agent', 'real estate', 'property agent',
  'professional services', 'b2b services',
];

// ── Scorer ───────────────────────────────────────────────────────────────────

function score(prompt: string, keywords: string[]): number {
  const lower = prompt.toLowerCase();
  return keywords.filter(k => lower.includes(k)).length;
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Determines the most appropriate scaffold type for a given prompt.
 *
 * Priority order:
 *  1. Ecommerce — shop/cart signals are unambiguous
 *  2. App       — interactive tools with CRUD
 *  3. Restaurant — food + booking signals
 *  4. SaaS      — pricing + trial + platform signals
 *  5. Portfolio — creative work showcase
 *  6. Blog      — content/articles/writing
 *  7. Event     — conference/schedule/speakers
 *  8. Professional — law/accountancy/clinic
 *  9. Generic   — catch-all
 *
 * Ties (equal scores) respect this priority order.
 */
export function detectScaffoldType(userPrompt: string): ScaffoldType {
  const lower = userPrompt.toLowerCase();

  // Hard stops: if these appear, override everything
  if (lower.includes('cart') || lower.includes('basket') || lower.includes('checkout')) {
    return 'ecommerce';
  }

  const scores: Record<ScaffoldType, number> = {
    ecommerce:    score(lower, ECOMMERCE_KEYWORDS),
    app:          score(lower, APP_KEYWORDS),
    restaurant:   score(lower, RESTAURANT_KEYWORDS),
    saas:         score(lower, SAAS_KEYWORDS),
    portfolio:    score(lower, PORTFOLIO_KEYWORDS),
    blog:         score(lower, BLOG_KEYWORDS),
    event:        score(lower, EVENT_KEYWORDS),
    professional: score(lower, PROFESSIONAL_KEYWORDS),
    generic:      0,
  };

  const priority: ScaffoldType[] = [
    'ecommerce', 'app', 'restaurant', 'saas',
    'portfolio', 'blog', 'event', 'professional',
  ];

  let best: ScaffoldType = 'generic';
  let bestScore = 0;

  for (const type of priority) {
    if (scores[type] > bestScore) {
      bestScore = scores[type];
      best = type;
    }
  }

  return best;
}

/**
 * Returns the default page slugs for a given scaffold type.
 * Used when the user's prompt doesn't mention specific pages.
 */
export function getDefaultPages(scaffold: ScaffoldType): Array<{ slug: string; name: string; description: string }> {
  switch (scaffold) {
    case 'ecommerce':
      return [
        { slug: 'index',    name: 'Home',     description: 'Hero, featured products, brand story, testimonials' },
        { slug: 'shop',     name: 'Shop',     description: 'Product grid with filtering, sorting, search' },
        { slug: 'cart',     name: 'Basket',   description: 'Cart items, order summary, promo codes, checkout' },
        { slug: 'about',    name: 'About',    description: 'Brand story, values, team' },
        { slug: 'contact',  name: 'Contact',  description: 'Contact form, location, business hours' },
      ];
    case 'restaurant':
      return [
        { slug: 'index',        name: 'Home',         description: 'Hero, featured dishes, opening hours, location' },
        { slug: 'menu',         name: 'Menu',          description: 'Full menu organised by category with prices and dietary icons' },
        { slug: 'reservations', name: 'Reservations',  description: 'Booking form, availability, special requests' },
        { slug: 'about',        name: 'Our Story',     description: 'Chef, kitchen philosophy, sourcing, history' },
        { slug: 'contact',      name: 'Find Us',       description: 'Map, address, parking, phone, opening hours' },
      ];
    case 'saas':
      return [
        { slug: 'index',    name: 'Home',     description: 'Hero, social proof, feature highlights, CTA' },
        { slug: 'features', name: 'Features', description: 'Detailed feature breakdown, how it works, screenshots' },
        { slug: 'pricing',  name: 'Pricing',  description: '3-tier pricing, feature comparison table, FAQ' },
        { slug: 'about',    name: 'About',    description: 'Team, mission, company story, investors' },
        { slug: 'contact',  name: 'Contact',  description: 'Sales enquiry form, support links, office locations' },
      ];
    case 'portfolio':
      return [
        { slug: 'index',   name: 'Home',    description: 'Striking hero, selected work preview, brief intro, CTA' },
        { slug: 'work',    name: 'Work',    description: 'Project grid with filtering by type/industry' },
        { slug: 'about',   name: 'About',   description: 'Bio, skills, experience, downloadable CV' },
        { slug: 'contact', name: 'Contact', description: 'Enquiry form, availability, social links' },
      ];
    case 'blog':
      return [
        { slug: 'index',   name: 'Home',    description: 'Hero, latest posts, featured categories, newsletter signup' },
        { slug: 'blog',    name: 'Blog',    description: 'Article listing with search, categories, pagination' },
        { slug: 'about',   name: 'About',   description: 'Author bio, credentials, social links' },
        { slug: 'contact', name: 'Contact', description: 'Contact form, collaboration enquiries' },
      ];
    case 'event':
      return [
        { slug: 'index',    name: 'Home',     description: 'Countdown, event details, headline speakers, CTA' },
        { slug: 'speakers', name: 'Speakers', description: 'Speaker profiles, bios, talk previews' },
        { slug: 'schedule', name: 'Schedule', description: 'Full agenda, session details, track filtering' },
        { slug: 'register', name: 'Register', description: 'Registration form, ticket types, pricing' },
        { slug: 'venue',    name: 'Venue',    description: 'Location, travel info, accommodation, map' },
      ];
    case 'professional':
      return [
        { slug: 'index',    name: 'Home',     description: 'Credibility hero, services overview, trust signals' },
        { slug: 'services', name: 'Services', description: 'Detailed service breakdown, process, fees' },
        { slug: 'team',     name: 'Team',     description: 'Team bios, qualifications, experience' },
        { slug: 'about',    name: 'About',    description: 'Firm history, values, accreditations' },
        { slug: 'contact',  name: 'Contact',  description: 'Enquiry form, office address, map, hours' },
      ];
    default: // app, generic
      return [
        { slug: 'index',   name: 'Home',    description: 'Main application interface or landing page' },
        { slug: 'about',   name: 'About',   description: 'About the product or company' },
        { slug: 'contact', name: 'Contact', description: 'Contact form and details' },
      ];
  }
}
