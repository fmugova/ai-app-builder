/**
 * Complexity Detection Utility
 * 
 * Analyzes user prompts to determine if they need:
 * - MODE 1: Simple HTML (single file with JS navigation)
 * - MODE 2: Full-Stack Next.js (multi-file with backend)
 * 
 * Location: lib/utils/complexity-detection.ts
 */

export type ProjectMode = 'simple-html' | 'fullstack-nextjs';

export interface ComplexityAnalysis {
  mode: ProjectMode;
  confidence: number; // 0-100
  detectedFeatures: string[];
  reasoning: string;
}

// ============================================
// COMPLEXITY KEYWORDS
// ============================================

/**
 * Keywords that indicate need for full-stack backend
 */
const FULLSTACK_KEYWORDS = {
  // Database & Persistence
  database: ['database', 'db', 'data persistence', 'store data', 'save data', 'crud', 'orm', 'prisma', 'supabase', 'mongodb', 'postgresql', 'mysql'],
  
  // Authentication
  auth: ['authentication', 'auth', 'login', 'signup', 'sign up', 'sign in', 'user accounts', 'user management', 'auth0', 'clerk', 'nextauth', 'jwt', 'session'],
  
  // Payments & Billing
  payments: ['payment', 'stripe', 'billing', 'subscription', 'checkout', 'credit card', 'paypal', 'revenue', 'invoice'],
  
  // APIs & Integrations
  api: ['api integration', 'external api', 'rest api', 'graphql', 'webhook', 'third-party', 'integration'],
  
  // Real-time Features
  realtime: ['real-time', 'realtime', 'websocket', 'socket.io', 'live updates', 'notifications', 'chat'],
  
  // Complex Business Logic
  logic: ['calculation', 'algorithm', 'tax calculation', 'financial', 'analytics', 'reporting', 'dashboard with data'],
  
  // Backend Specific
  backend: ['backend', 'server-side', 'api route', 'endpoint', 'middleware', 'cron job', 'scheduled task'],
  
  // Admin & Management
  admin: ['admin panel', 'admin dashboard', 'user management', 'role-based', 'permissions', 'access control'],
  
  // File Uploads
  files: ['file upload', 'image upload', 'file storage', 's3', 'cloudinary'],
  
  // Email & Communications
  email: ['send email', 'email notification', 'smtp', 'sendgrid', 'mailgun', 'transactional email'],
};

/**
 * Keywords that indicate simple HTML is sufficient
 */
const SIMPLE_KEYWORDS = [
  'landing page',
  'portfolio',
  'website',
  'marketing page',
  'static site',
  'blog post',
  'simple site',
  'single page',
  'brochure',
  'coming soon',
  'under construction',
];

/**
 * Phrases that explicitly request single file
 */
const SINGLE_FILE_INDICATORS = [
  'on one html file',
  'in one file',
  'single file',
  'all in one',
  'not as separate files',
  "don't split into files",
  'single page application',
  'spa',
];

// ============================================
// COMPLEXITY DETECTION
// ============================================

/**
 * Analyze prompt complexity and determine appropriate mode
 */
export function detectComplexity(prompt: string): ComplexityAnalysis {
  if (!prompt || typeof prompt !== 'string') {
    return {
      mode: 'simple-html',
      confidence: 50,
      detectedFeatures: [],
      reasoning: 'No prompt provided - defaulting to simple HTML',
    };
  }

  const lowerPrompt = prompt.toLowerCase();
  const detectedFeatures: string[] = [];
  let fullstackScore = 0;
  let simpleScore = 0;

  // Check for explicit single-file request
  const wantsSingleFile = SINGLE_FILE_INDICATORS.some(indicator => 
    lowerPrompt.includes(indicator)
  );

  if (wantsSingleFile) {
    return {
      mode: 'simple-html',
      confidence: 95,
      detectedFeatures: ['explicit-single-file-request'],
      reasoning: 'User explicitly requested single file/SPA format',
    };
  }

  // Check for full-stack keywords
  for (const [category, keywords] of Object.entries(FULLSTACK_KEYWORDS)) {
    const foundKeywords = keywords.filter(keyword => lowerPrompt.includes(keyword));
    
    if (foundKeywords.length > 0) {
      detectedFeatures.push(...foundKeywords.map(k => `${category}:${k}`));
      
      // Different categories have different weights
      const weight = {
        database: 30,
        auth: 25,
        payments: 25,
        api: 20,
        realtime: 20,
        logic: 15,
        backend: 25,
        admin: 20,
        files: 15,
        email: 15,
      }[category] || 10;

      fullstackScore += weight * foundKeywords.length;
    }
  }

  // Check for simple keywords (negative weight for fullstack)
  const simpleMatches = SIMPLE_KEYWORDS.filter(keyword => lowerPrompt.includes(keyword));
  if (simpleMatches.length > 0) {
    simpleScore += 20 * simpleMatches.length;
    detectedFeatures.push(...simpleMatches.map(k => `simple:${k}`));
  }

  // Check for complexity indicators in sentence structure
  const complexityIndicators = [
    { pattern: /with\s+(?:database|auth|payment|api)/i, score: 20 },
    { pattern: /integrate\s+with/i, score: 15 },
    { pattern: /connect\s+to/i, score: 15 },
    { pattern: /automatically\s+(?:calculate|process|send)/i, score: 15 },
    { pattern: /real-time/i, score: 20 },
    { pattern: /admin\s+(?:panel|dashboard)/i, score: 20 },
  ];

  complexityIndicators.forEach(({ pattern, score }) => {
    if (pattern.test(lowerPrompt)) {
      fullstackScore += score;
    }
  });

  // Calculate final score
  const totalScore = fullstackScore - simpleScore;
  const confidence = Math.min(95, Math.max(50, Math.abs(totalScore)));

  // Determine mode based on threshold
  const FULLSTACK_THRESHOLD = 30; // Scores above this = fullstack

  const mode: ProjectMode = totalScore >= FULLSTACK_THRESHOLD ? 'fullstack-nextjs' : 'simple-html';

  const reasoning = mode === 'fullstack-nextjs'
    ? `Detected ${detectedFeatures.length} full-stack features requiring backend (score: ${totalScore})`
    : `Simple frontend sufficient - no critical backend requirements detected (score: ${totalScore})`;

  return {
    mode,
    confidence,
    detectedFeatures,
    reasoning,
  };
}

/**
 * Generate system prompt suffix based on detected complexity
 */
export function getModeSuffix(analysis: ComplexityAnalysis): string {
  if (analysis.mode === 'fullstack-nextjs') {
    return `

⚠️ DETECTED COMPLEXITY LEVEL: FULL-STACK
Features detected: ${analysis.detectedFeatures.slice(0, 5).join(', ')}

YOU MUST generate a complete Next.js application with:
- Multiple TypeScript files in proper Next.js 14+ structure
- API routes in app/api/ directory
- Database schema (Prisma)
- Authentication setup
- Environment variables
- Full README with setup instructions

OUTPUT FORMAT: Multi-file structure with file delimiters
`;
  } else {
    return `

ℹ️ DETECTED COMPLEXITY LEVEL: SIMPLE HTML

If the user requests MULTIPLE PAGES (home, about, services, contact, etc.):
- Create SEPARATE .html files (index.html, about.html, etc.)
- Link pages with href="about.html" style navigation
- Never use JavaScript-based routing for multi-page sites

If the user requests a SINGLE PAGE app or interactive tool:
- Generate one complete HTML file with all CSS and JS inline
- Use JavaScript for dynamic sections/tabs within the page

OUTPUT FORMAT: Separate .html files for multi-page, single file for single-page apps
`;
  }
}

// ============================================
// EXAMPLES & TESTS
// ============================================

export const COMPLEXITY_EXAMPLES = [
  {
    input: 'Create a landing page for a coffee shop with home, menu, and contact pages',
    expectedMode: 'simple-html' as ProjectMode,
    reason: 'Simple multi-page site with no backend requirements',
  },
  {
    input: 'Build a tax calculator for freelancers with database to store calculations and user accounts',
    expectedMode: 'fullstack-nextjs' as ProjectMode,
    reason: 'Requires database and authentication',
  },
  {
    input: 'Personal Finance & Tax Estimator for Freelancers with Stripe integration and Auth0 authentication',
    expectedMode: 'fullstack-nextjs' as ProjectMode,
    reason: 'Requires Stripe API, Auth0, and likely database',
  },
  {
    input: 'Create a portal where freelancers track project income and expenses. The app should automatically calculate estimated quarterly tax payments',
    expectedMode: 'fullstack-nextjs' as ProjectMode,
    reason: 'Data persistence and complex calculations require backend',
  },
  {
    input: 'Portfolio website with projects and contact form',
    expectedMode: 'simple-html' as ProjectMode,
    reason: 'Static content with client-side form - no backend needed',
  },
  {
    input: 'CRM dashboard with contacts database, deal tracking, and email integration',
    expectedMode: 'fullstack-nextjs' as ProjectMode,
    reason: 'Database, email API, complex data management',
  },
  {
    input: 'Simple blog with 3 posts',
    expectedMode: 'simple-html' as ProjectMode,
    reason: 'Static content - no CMS or backend needed',
  },
  {
    input: 'Create a blog CMS with authentication and database for posts',
    expectedMode: 'fullstack-nextjs' as ProjectMode,
    reason: 'Explicit database and auth requirements',
  },
];

/**
 * Test complexity detection
 */
export function testComplexityDetection(): void {
  console.log('🧪 Testing Complexity Detection...\n');

  COMPLEXITY_EXAMPLES.forEach(({ input, expectedMode }) => {
    const analysis = detectComplexity(input);
    const passed = analysis.mode === expectedMode;
    
    console.log(`${passed ? '✅' : '❌'} "${input}"`);
    console.log(`   Expected: ${expectedMode}`);
    console.log(`   Got: ${analysis.mode} (confidence: ${analysis.confidence}%)`);
    console.log(`   Reasoning: ${analysis.reasoning}`);
    console.log(`   Features: ${analysis.detectedFeatures.slice(0, 5).join(', ')}\n`);
  });
}

// ============================================
// INTEGRATION HELPER
// ============================================

/**
 * Complete analysis for a user prompt
 * Returns both complexity and recommended system prompt addition
 */
export function analyzePrompt(prompt: string): {
  analysis: ComplexityAnalysis;
  systemPromptSuffix: string;
  shouldUseFullstack: boolean;
} {
  const analysis = detectComplexity(prompt);
  const systemPromptSuffix = getModeSuffix(analysis);
  const shouldUseFullstack = analysis.mode === 'fullstack-nextjs';

  return {
    analysis,
    systemPromptSuffix,
    shouldUseFullstack,
  };
}
