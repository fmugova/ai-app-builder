// lib/generation/prompt-decomposition.ts
// Analyzes prompt complexity and decomposes complex prompts into ordered phases.
// No AI calls — purely heuristic analysis based on keyword detection.

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DecompositionPhase {
  phaseNumber: number
  title: string
  description: string
  /** The focused sub-prompt sent to /api/generate/stream for this phase */
  prompt: string
  estimatedTokens: number
  /** Expected output file paths for display in the wizard */
  files: string[]
}

export interface DecompositionResult {
  totalPhases: number
  /** Human-readable estimate, e.g. "4–6 minutes" */
  estimatedTime: string
  phases: DecompositionPhase[]
}

// ── Feature detection ─────────────────────────────────────────────────────────

const FEATURE_PATTERNS: Array<{ feature: string; patterns: string[] }> = [
  {
    feature: 'authentication',
    patterns: ['auth', 'login', 'sign in', 'sign up', 'register', 'user account', 'jwt', 'oauth'],
  },
  {
    feature: 'dashboard',
    patterns: ['dashboard', 'analytics', 'charts', 'metrics', 'kpi', 'statistics', 'graphs'],
  },
  {
    feature: 'crud',
    patterns: ['create', 'edit', 'delete', 'manage', 'data table', 'crud', 'add new', 'form'],
  },
  {
    feature: 'payments',
    patterns: ['payment', 'stripe', 'checkout', 'billing', 'subscription', 'invoice'],
  },
  {
    feature: 'notifications',
    patterns: ['notification', 'alert', 'email', 'realtime', 'websocket', 'push notification'],
  },
  {
    feature: 'search',
    patterns: ['search', 'filter', 'sort', 'pagination', 'fuzzy search'],
  },
  {
    feature: 'settings',
    patterns: ['settings', 'preferences', 'profile settings', 'account settings', 'configuration'],
  },
  {
    feature: 'reports',
    patterns: ['reports', 'export', 'csv', 'pdf', 'download data', 'analytics page'],
  },
]

const TOKENS_PER_FEATURE = 2200
const BASE_TOKENS = 3500
/** Prompts above this estimated token count will trigger phase decomposition */
const COMPLEXITY_THRESHOLD = 5500

// ── Analysis ──────────────────────────────────────────────────────────────────

export function analyzePromptComplexity(prompt: string): {
  isComplex: boolean
  estimatedPages: number
  estimatedTokens: number
  features: string[]
} {
  const lower = prompt.slice(0, 3000).toLowerCase()

  const features: string[] = []
  for (const { feature, patterns } of FEATURE_PATTERNS) {
    if (patterns.some((p) => lower.includes(p))) {
      features.push(feature)
    }
  }

  // Heuristic: count distinct page mentions
  const pageMatches = lower.match(
    /\b(page|screen|view|section|tab|panel|module)\b/g
  )
  const estimatedPages = Math.max(2, Math.min(pageMatches?.length ?? 1, 14))

  const estimatedTokens = BASE_TOKENS + features.length * TOKENS_PER_FEATURE
  const isComplex = estimatedTokens > COMPLEXITY_THRESHOLD || features.length >= 3

  return { isComplex, estimatedPages, estimatedTokens, features }
}

// ── Decomposition ─────────────────────────────────────────────────────────────

export function decomposePrompt(prompt: string): DecompositionResult {
  const { features } = analyzePromptComplexity(prompt)

  const phases: DecompositionPhase[] = []

  // ── Phase 1: Core layout + main page ────────────────────────────────────────
  phases.push({
    phaseNumber: 1,
    title: 'Core Layout & Main Page',
    description: 'App shell, navigation, sidebar, and main dashboard/home page',
    prompt: `${prompt}

PHASE 1 INSTRUCTION: Generate ONLY the core app structure:
- app/layout.tsx with sidebar or top navigation
- app/page.tsx (main dashboard / home page with stat cards and a summary chart)
- Core shared components: Sidebar, Header, any layout wrappers
- Use the pre-built components/ui/sidebar.tsx and components/ui/stat-card.tsx from the scaffold
- Leave feature-specific pages as minimal stubs (just export a heading — content comes in later phases)
- Scaffold files (package.json, Supabase client, globals.css) are already provided — do NOT output them`,
    estimatedTokens: 4000,
    files: ['app/layout.tsx', 'app/page.tsx', 'components/layout/Sidebar.tsx'],
  })

  // ── Phase 2: Primary feature pages ──────────────────────────────────────────
  const primaryFeatures = features.filter(
    (f) => f !== 'authentication' && f !== 'settings' && f !== 'reports'
  )

  if (primaryFeatures.length > 0) {
    const featureList = primaryFeatures
      .slice(0, 3)
      .map((f) => `- ${f.charAt(0).toUpperCase() + f.slice(1)} page`)
      .join('\n')

    phases.push({
      phaseNumber: 2,
      title: 'Feature Pages',
      description: `${primaryFeatures.slice(0, 3).join(', ')} pages`,
      prompt: `${prompt}

PHASE 2 INSTRUCTION: The layout from Phase 1 already exists. Generate ONLY the main feature pages:
${featureList}
- Import and reuse app/layout.tsx for consistent navigation
- Use components/ui/data-table.tsx for tabular data
- Use components/ui/chart.tsx (LineChart) for analytics data
- Populate with realistic mock data — no placeholder text
- Do NOT regenerate layout, navigation, or app/layout.tsx
- Scaffold files are already provided — do NOT output them`,
      estimatedTokens: 5000,
      files: primaryFeatures.slice(0, 3).map((f) => `app/${f}/page.tsx`),
    })
  }

  // ── Phase 3: CRUD / data management / settings ───────────────────────────────
  const hasCrud = features.includes('crud')
  const hasSettings = features.includes('settings')
  const hasReports = features.includes('reports')

  if (hasCrud || hasSettings || hasReports) {
    const focuses: string[] = []
    if (hasCrud) focuses.push('- CRUD forms and data tables with TypeScript types\n- API routes (app/api/[resource]/route.ts) with mock data responses')
    if (hasSettings) focuses.push('- Settings page (app/settings/page.tsx) with profile and preferences')
    if (hasReports) focuses.push('- Reports page with export options and data visualizations using components/ui/chart.tsx')

    phases.push({
      phaseNumber: phases.length + 1,
      title: 'Data Management' + (hasSettings ? ' & Settings' : ''),
      description: [hasCrud && 'CRUD forms', hasSettings && 'settings', hasReports && 'reports']
        .filter(Boolean)
        .join(', '),
      prompt: `${prompt}

PHASE ${phases.length + 1} INSTRUCTION: Generate data management features, building on Phase 1 + 2:
${focuses.join('\n')}
- Do NOT regenerate layout, navigation, or pages already created in earlier phases
- Scaffold files are already provided — do NOT output them`,
      estimatedTokens: 4000,
      files: [
        hasCrud ? 'app/api/resource/route.ts' : null,
        hasSettings ? 'app/settings/page.tsx' : null,
        hasReports ? 'app/reports/page.tsx' : null,
      ].filter((f): f is string => f !== null),
    })
  }

  // ── Phase 4: Authentication ──────────────────────────────────────────────────
  if (features.includes('authentication')) {
    phases.push({
      phaseNumber: phases.length + 1,
      title: 'Authentication',
      description: 'Login, signup, and protected routes',
      prompt: `${prompt}

PHASE ${phases.length + 1} INSTRUCTION: Generate authentication using Supabase Auth (already in scaffold):
- app/auth/login/page.tsx
- app/auth/signup/page.tsx
- Update middleware.ts for protected routes
- Update app/layout.tsx navigation to show user avatar and logout
- Do NOT regenerate any other pages or scaffold files`,
      estimatedTokens: 3000,
      files: ['app/auth/login/page.tsx', 'app/auth/signup/page.tsx', 'middleware.ts'],
    })
  }

  // ── Ensure at least 2 phases ─────────────────────────────────────────────────
  if (phases.length === 1) {
    phases.push({
      phaseNumber: 2,
      title: 'Feature Pages & API Routes',
      description: 'Secondary pages, components, and API routes',
      prompt: `${prompt}

PHASE 2 INSTRUCTION: Building on the Phase 1 layout, generate remaining feature pages and API routes.
Use realistic data. Do NOT regenerate app/layout.tsx or scaffold files.`,
      estimatedTokens: 4000,
      files: ['app/feature/page.tsx', 'app/api/data/route.ts'],
    })
  }

  const totalMinutes = phases.length * 2
  return {
    totalPhases: phases.length,
    estimatedTime: `${totalMinutes}–${totalMinutes + 2} min`,
    phases,
  }
}
