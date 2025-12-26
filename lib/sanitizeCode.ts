// Whitelisted script sources (prefix match)
const SCRIPT_WHITELIST_PREFIXES = [
  'https://unpkg.com/react@18/umd/react.development.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com',
  'https://unpkg.com',
];

export function sanitizeCode(input: string): string {
  let code = input;

  // Remove iframes ONLY if not in React context
  if (!code.includes('ReactDOM') && !code.includes('React.createElement')) {
    code = code.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
  }

  // Remove inline event handlers: onclick="...", onload='...', onerror=..., etc.
  code = code.replace(/on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Neutralize javascript: URLs in href/src
  code = code.replace(/\b(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, '$1="#"');

  // Remove non-whitelisted <script> tags
  code = code.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (fullTag) => {
    const srcMatch = fullTag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    
    // Allow inline Babel scripts for React
    if (!srcMatch && fullTag.includes('type="text/babel"')) {
      return fullTag;
    }
    
    if (!srcMatch) {
      // Inline script without Babel — remove
      return '';
    }
    
    const src = srcMatch[1];
    // Allow if src starts with any whitelisted prefix
    const allowed = SCRIPT_WHITELIST_PREFIXES.some((prefix) => src.startsWith(prefix));
    return allowed ? fullTag : '';
  });

  return code;
}

export function isCodeSafe(input: string): boolean {
  // Unsafe if any iframe present (unless React code)
  if (/<iframe\b/i.test(input) && !isReactCode(input)) return false;

  // Unsafe if any inline event handler present
  if (/on[a-z]+\s*=/i.test(input)) return false;

  // Unsafe if javascript: URLs present
  if (/\b(href|src)\s*=\s*(['"])\s*javascript:/i.test(input)) return false;

  // Unsafe if any non-whitelisted or inline script present
  const scriptTags = input.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const tag of scriptTags) {
    // Allow Babel scripts
    if (tag.includes('type="text/babel"')) continue;
    
    const srcMatch = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    if (!srcMatch) {
      // inline script without Babel
      return false;
    }
    const src = srcMatch[1];
    const allowed = SCRIPT_WHITELIST_PREFIXES.some((prefix) => src.startsWith(prefix));
    if (!allowed) return false;
  }

  return true;
}

export function isReactCode(code: string): boolean {
  // Check for common React patterns
  const reactPatterns = [
    /import\s+.*from\s+['"]react['"]/,
    /import\s+.*from\s+['"]react-dom['"]/,
    /<script[^>]*type\s*=\s*["']text\/babel["']/,
    /React\./,
    /ReactDOM\./,
    /ReactDOM\.createRoot/,
    /React\.createElement/,
    /useState/,
    /useEffect/,
    /function\s+\w+\s*\([^)]*\)\s*{[\s\S]*return\s*\(/,
  ];

  return reactPatterns.some(pattern => pattern.test(code));
}