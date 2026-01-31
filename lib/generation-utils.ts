/**
 * Utilities for generation optimization
 */

export interface GenerationEstimate {
  min: number;
  max: number;
  complexity: 'simple' | 'medium' | 'complex';
  features: string[];
}

export function estimateGenerationTime(prompt: string): GenerationEstimate {
  const wordCount = prompt.split(/\s+/).length;
  const lowerPrompt = prompt.toLowerCase();

  // Feature detection
  const features: string[] = [];
  const hasDatabase = /database|supabase|firebase|crud|data\s+storage/i.test(prompt);
  const hasAuth = /auth|login|signup|sign\s+in|user\s+account/i.test(prompt);
  const hasMultiPage = /multi[- ]?page|navigation|routes|pages/i.test(prompt);
  const hasAnimations = /animation|motion|framer|gsap|scroll\s+effect/i.test(prompt);
  const hasForms = /form|input|validation|submit/i.test(prompt);
  const hasCharts = /chart|graph|visualization|analytics/i.test(prompt);

  if (hasDatabase) features.push('Database');
  if (hasAuth) features.push('Authentication');
  if (hasMultiPage) features.push('Multi-page');
  if (hasAnimations) features.push('Animations');
  if (hasForms) features.push('Forms');
  if (hasCharts) features.push('Charts');

  // Calculate complexity
  let complexity: 'simple' | 'medium' | 'complex' = 'simple';
  let min = 15;
  let max = 30;

  const complexityScore = 
    (wordCount > 50 ? 1 : 0) +
    (hasDatabase ? 1 : 0) +
    (hasAuth ? 1 : 0) +
    (hasMultiPage ? 1 : 0) +
    (hasAnimations ? 1 : 0) +
    (hasForms ? 1 : 0) +
    (hasCharts ? 1 : 0);

  if (complexityScore >= 3 && complexityScore < 6) {
    complexity = 'medium';
    min = 30;
    max = 60;
  } else if (complexityScore >= 6) {
    complexity = 'complex';
    min = 60;
    max = 120;
  }

  return { min, max, complexity, features };
}

export function getComplexityColor(complexity: 'simple' | 'medium' | 'complex'): string {
  switch (complexity) {
    case 'simple': return 'text-green-600';
    case 'medium': return 'text-yellow-600';
    case 'complex': return 'text-red-600';
  }
}

export function getComplexityIcon(complexity: 'simple' | 'medium' | 'complex'): string {
  switch (complexity) {
    case 'simple': return '🟢';
    case 'medium': return '🟡';
    case 'complex': return '🔴';
  }
}
