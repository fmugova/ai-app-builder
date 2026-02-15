/**
 * Title Extraction Utility
 * 
 * Extracts clean project titles from user prompts and AI responses
 * Location: lib/utils/title-extraction.ts
 */

// ============================================
// TITLE EXTRACTION FROM USER PROMPTS
// ============================================

/**
 * Extract a clean project title from user's prompt
 * Transforms: "Create a landing page for a coffee shop with home, menu..."
 * Into: "Coffee Shop Website"
 */
export function extractTitleFromPrompt(prompt: string): string {
  if (!prompt || typeof prompt !== 'string') {
    return 'Untitled Project';
  }

  const cleanPrompt = prompt.trim().toLowerCase();

  // Pattern 1: "create a [TYPE] for [SUBJECT]"
  const createForMatch = cleanPrompt.match(/create\s+(?:a|an)\s+(.+?)\s+for\s+(?:a|an|my)?\s*(.+?)(?:\s+with|\s+that|\.|,|$)/i);
  if (createForMatch) {
    const type = createForMatch[1].trim().split(/\s+/).slice(0, 2).join(' ');
    const subject = createForMatch[2].trim().split(/\s+/).slice(0, 3).join(' ');
    return formatTitle(`${subject} ${type}`);
  }

  // Pattern 2: "build a [SUBJECT] [TYPE]"
  const buildMatch = cleanPrompt.match(/build\s+(?:a|an)\s+(.+?)\s+(app|application|site|website|platform|portal|dashboard|system)(?:\s|$)/i);
  if (buildMatch) {
    const subject = buildMatch[1].trim();
    const type = buildMatch[2].trim();
    return formatTitle(`${subject} ${type}`);
  }

  // Pattern 3: "[SUBJECT] [TYPE]" (e.g., "freelancer tax estimator")
  const directMatch = cleanPrompt.match(/^(.+?)\s+(app|application|site|website|platform|portal|dashboard|calculator|estimator|tracker|manager|system)(?:\s|$)/i);
  if (directMatch) {
    const subject = directMatch[1].trim();
    const type = directMatch[2].trim();
    return formatTitle(`${subject} ${type}`);
  }

  // Pattern 4: Specific domain keywords
  const domainPatterns = [
    { pattern: /tax.*(?:estimator|calculator|tracker)/i, title: 'Tax Estimator' },
    { pattern: /finance.*(?:tracker|dashboard|manager)/i, title: 'Finance Dashboard' },
    { pattern: /coffee.*(?:shop|store)/i, title: 'Coffee Shop Website' },
    { pattern: /e-?commerce/i, title: 'E-Commerce Platform' },
    { pattern: /crm/i, title: 'CRM Dashboard' },
    { pattern: /project.*management/i, title: 'Project Manager' },
    { pattern: /inventory/i, title: 'Inventory System' },
    { pattern: /portfolio/i, title: 'Portfolio Website' },
    { pattern: /blog/i, title: 'Blog Platform' },
    { pattern: /social.*media/i, title: 'Social Dashboard' },
  ];

  for (const { pattern, title } of domainPatterns) {
    if (pattern.test(cleanPrompt)) {
      return title;
    }
  }

  // Pattern 5: Just use first few meaningful words
  const words = cleanPrompt
    .replace(/^(create|build|make|develop|design)\s+(?:a|an|the)?\s*/i, '')
    .replace(/\s+(with|that|which|for).*/i, '')
    .split(/\s+/)
    .filter(word => word.length > 2)
    .slice(0, 4);

  if (words.length > 0) {
    return formatTitle(words.join(' '));
  }

  return 'Untitled Project';
}

/**
 * Format title to proper case
 */
function formatTitle(title: string): string {
  return title
    .split(/\s+/)
    .map(word => {
      // Keep acronyms uppercase
      if (word.toUpperCase() === word && word.length <= 4) {
        return word;
      }
      // Capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50); // Max 50 chars
}

// ============================================
// TITLE EXTRACTION FROM AI RESPONSES
// ============================================

/**
 * Extract title from AI response that includes <PROJECT_TITLE> tag
 */
export function extractTitleFromResponse(response: string): string | null {
  if (!response || typeof response !== 'string') {
    return null;
  }

  // Look for <PROJECT_TITLE>Title Here</PROJECT_TITLE>
  const titleMatch = response.match(/<PROJECT_TITLE>(.*?)<\/PROJECT_TITLE>/i);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim().slice(0, 50);
  }

  // Fallback: Look for <title> tag in HTML
  const htmlTitleMatch = response.match(/<title>(.*?)<\/title>/i);
  if (htmlTitleMatch && htmlTitleMatch[1]) {
    // Remove common suffixes
    return htmlTitleMatch[1]
      .replace(/\s*[-|]\s*(Dashboard|App|Website|Platform)?\s*$/i, '')
      .trim()
      .slice(0, 50);
  }

  return null;
}

/**
 * Remove title tags from AI response
 */
export function removeTitleTags(response: string): string {
  return response
    .replace(/<PROJECT_TITLE>.*?<\/PROJECT_TITLE>\s*/gi, '')
    .trim();
}

// ============================================
// COMBINED EXTRACTION
// ============================================

/**
 * Smart title extraction - tries AI response first, falls back to prompt
 */
export function extractProjectTitle(
  userPrompt: string,
  aiResponse?: string
): string {
  // First, try to extract from AI response
  if (aiResponse) {
    const aiTitle = extractTitleFromResponse(aiResponse);
    if (aiTitle) {
      return aiTitle;
    }
  }

  // Fallback to extracting from user prompt
  return extractTitleFromPrompt(userPrompt);
}

// ============================================
// EXAMPLES & TESTS
// ============================================

export const TITLE_EXTRACTION_EXAMPLES = [
  {
    input: 'Create a landing page for a coffee shop with home, menu, and contact pages',
    expected: 'Coffee Shop Website',
  },
  {
    input: 'Build a tax calculator for freelancers',
    expected: 'Tax Calculator',
  },
  {
    input: 'Personal Finance & Tax Estimator for Freelancers',
    expected: 'Personal Finance Tax Estimator',
  },
  {
    input: 'Create a CRM dashboard with contacts and deals',
    expected: 'CRM Dashboard',
  },
  {
    input: 'Freelancer tax portal with stripe integration',
    expected: 'Freelancer Tax Portal',
  },
  {
    input: 'E-commerce admin panel',
    expected: 'E-Commerce Platform',
  },
  {
    input: 'Project management app',
    expected: 'Project Management App',
  },
];

/**
 * Test the title extraction
 */
export function testTitleExtraction(): void {
  console.log('🧪 Testing Title Extraction...\n');

  TITLE_EXTRACTION_EXAMPLES.forEach(({ input, expected }) => {
    const result = extractTitleFromPrompt(input);
    const passed = result.toLowerCase() === expected.toLowerCase();
    console.log(`${passed ? '✅' : '❌'} Input: "${input}"`);
    console.log(`   Expected: "${expected}"`);
    console.log(`   Got: "${result}"\n`);
  });
}
