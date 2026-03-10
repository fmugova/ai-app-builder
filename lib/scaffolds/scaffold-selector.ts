// lib/scaffolds/scaffold-selector.ts
// Analyzes a user prompt and selects the most appropriate project scaffold type.
// Returns one of 7 scaffold types with a confidence score.

export type ScaffoldType =
  | 'dashboard'
  | 'ecommerce'
  | 'blog'
  | 'social'
  | 'portfolio'
  | 'landing'
  | 'marketing'

const SCAFFOLD_KEYWORDS: Record<ScaffoldType, string[]> = {
  dashboard: [
    'dashboard', 'admin', 'crm', 'analytics', 'metrics', 'kpi', 'reports',
    'charts', 'data table', 'management system', 'admin panel', 'backoffice',
    'back office', 'monitoring', 'statistics', 'sidebar navigation', 'contacts',
    'leads', 'deals', 'pipeline', 'inventory management', 'order management',
    'user management', 'employee', 'hr system', 'erp', 'saas app', 'web app',
    'application', 'task manager', 'project management', 'kanban', 'gantt',
  ],
  ecommerce: [
    'ecommerce', 'e-commerce', 'online shop', 'online store', 'product catalog',
    'shopping cart', 'checkout', 'payment', 'stripe payments', 'buy', 'sell',
    'marketplace', 'vendor', 'shipping', 'wishlist', 'product listing',
    'add to cart', 'storefront', 'woocommerce', 'shopify like',
  ],
  blog: [
    'blog', 'article', 'post', 'cms', 'content management', 'editorial',
    'news site', 'magazine', 'publication', 'author profile', 'categories',
    'tags', 'comments section', 'markdown', 'mdx', 'rss feed', 'newsletter',
  ],
  social: [
    'social network', 'community', 'forum', 'feed', 'timeline', 'follow',
    'friend', 'messaging', 'chat', 'notification', 'user profiles', 'posts',
    'likes', 'shares', 'social media', 'twitter like', 'instagram like',
    'discord like', 'slack like',
  ],
  portfolio: [
    'portfolio', 'showcase', 'resume', 'cv', 'personal site', 'personal website',
    'work samples', 'projects gallery', 'about me', 'hire me', 'freelancer',
    'designer portfolio', 'developer portfolio',
  ],
  landing: [
    'landing page', 'saas landing', 'waitlist', 'coming soon', 'sign up page',
    'lead capture', 'conversion page', 'product launch', 'one page', 'single page',
    'hero section', 'launch page',
  ],
  marketing: [
    'company website', 'business website', 'corporate website', 'agency website',
    'brochure site', 'services page', 'about us page', 'contact us page',
    'marketing site', 'startup website', 'website for',
  ],
}

// ── Scoring ────────────────────────────────────────────────────────────────────

function scoreScaffold(lower: string, keywords: string[]): number {
  let score = 0
  for (const kw of keywords) {
    if (lower.includes(kw)) {
      // Longer keyword = more specific = higher score
      score += kw.split(' ').length
    }
  }
  return score
}

// ── Main export ────────────────────────────────────────────────────────────────

export function selectScaffold(prompt: string): {
  scaffold: ScaffoldType
  confidence: number
  reasoning: string
  alternativeScaffolds?: ScaffoldType[]
} {
  // Limit to 3000 chars to prevent ReDoS on huge prompts
  const lower = prompt.slice(0, 3000).toLowerCase()

  const scored = (Object.entries(SCAFFOLD_KEYWORDS) as [ScaffoldType, string[]][]).map(
    ([type, keywords]) => ({ scaffold: type, score: scoreScaffold(lower, keywords) })
  )

  scored.sort((a, b) => b.score - a.score)

  const top = scored[0]
  const totalScore = scored.reduce((acc, s) => acc + s.score, 0)
  const confidence = totalScore > 0 ? Math.min(top.score / totalScore, 1) : 0.15

  // Default to 'marketing' when no keywords matched
  const selected: ScaffoldType = top.score === 0 ? 'marketing' : top.scaffold

  const alternatives = scored
    .slice(1, 3)
    .filter((s) => s.score > 0)
    .map((s) => s.scaffold)

  const reasoning =
    top.score === 0
      ? 'No specific keywords found — defaulting to marketing scaffold'
      : `Matched ${selected} scaffold (score: ${top.score})`

  return {
    scaffold: selected,
    confidence,
    reasoning,
    alternativeScaffolds: alternatives.length > 0 ? alternatives : undefined,
  }
}

// ── Pipeline routing helper ────────────────────────────────────────────────────
// These scaffold types benefit from the Next.js pipeline (backend features).
// Others are better served by the HTML multi-page pipeline (faster, simpler).

export const NEXTJS_SCAFFOLD_TYPES: ScaffoldType[] = [
  'dashboard',
  'ecommerce',
  'social',
]

export function scaffoldUsesNextjs(scaffold: ScaffoldType): boolean {
  return NEXTJS_SCAFFOLD_TYPES.includes(scaffold)
}
