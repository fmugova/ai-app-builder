/**
 * Smart Project Name Generator
 * Extracts meaningful project names from user prompts
 */

export function generateSmartProjectName(prompt: string): string {
  if (!prompt || prompt.trim().length === 0) {
    return 'Untitled Project';
  }

  // Clean the prompt
  let cleanPrompt = prompt.trim();

  // Remove common AI response prefixes
  cleanPrompt = cleanPrompt.replace(/^(?:I'll create|I will create|Here's|Here is|This is|Let me create|I'm creating|Creating)\s+(?:a|an|the)?\s*/i, '');
  cleanPrompt = cleanPrompt.replace(/^(?:Build|Make|Generate|Design|Develop)\s+(?:a|an|the|me)?\s*/i, '');
  
  // Remove "for you" type phrases
  cleanPrompt = cleanPrompt.replace(/\s+for (?:you|me|us)\s*$/i, '');
  
  // Extract first sentence or clause
  const firstSentence = cleanPrompt.split(/[.!?;]/)[0];
  
  // Common patterns to extract
  const patterns = [
    // "a coffee shop website" -> "Coffee Shop Website"
    /(?:a|an)\s+([a-z0-9\s-]+(?:website|app|page|site|dashboard|platform|tool|system|portal))/i,
    // "portfolio website with..." -> "Portfolio Website"
    /^([a-z0-9\s-]+(?:website|app|page|site|dashboard|platform|tool|system|portal))\s+(?:with|that|for)/i,
    // "landing page for..." -> "Landing Page"
    /^([a-z0-9\s-]+(?:website|app|page|site|dashboard|platform|tool|system|portal))/i,
    // "multi-page website" -> "Multi-Page Website"
    /([a-z0-9\s-]+website)/i,
    // Just take first few meaningful words
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/,
  ];

  for (const pattern of patterns) {
    const match = firstSentence.match(pattern);
    if (match && match[1]) {
      let name = match[1].trim();
      
      // Capitalize words
      name = name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      
      // Limit length
      if (name.length > 50) {
        name = name.substring(0, 47) + '...';
      }
      
      return name;
    }
  }

  // Fallback: Take first 3-5 words and capitalize
  const words = firstSentence.trim().split(/\s+/).slice(0, 5);
  if (words.length > 0) {
    let name = words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    if (name.length > 50) {
      name = name.substring(0, 47) + '...';
    }
    
    return name;
  }

  return 'Untitled Project';
}

/**
 * Generate a URL-safe slug from a project name
 */
export function generateProjectSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60) || 'project';
}

/**
 * Examples:
 * 
 * Input: "I'll create a coffee shop website with menu and contact sections"
 * Output: "Coffee Shop Website"
 * 
 * Input: "Build me a portfolio website"
 * Output: "Portfolio Website"
 * 
 * Input: "landing page for a startup"
 * Output: "Landing Page"
 * 
 * Input: "Create a task management app"
 * Output: "Task Management App"
 * 
 * Input: "multi-page website with home, about, services"
 * Output: "Multi-Page Website"
 */
