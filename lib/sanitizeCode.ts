// Whitelisted script sources (prefix match)
const SCRIPT_WHITELIST_PREFIXES = [
  'https://unpkg.com/react@18/umd/react.development.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://cdn.tailwindcss.com',
  'https://cdn.tailwindcss.com/tailwind.css',
];

export function sanitizeCode(input: string): string {
  let code = input;

  // 1) Remove all iframe tags
  code = code.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');

  // 2) Remove inline event handlers: onclick="...", onload='...', onerror=..., etc.
  code = code.replace(/on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // 3) Neutralize javascript: URLs in href/src
  code = code.replace(/\b(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, '$1="#"');

  // 4) Remove non-whitelisted or inline <script> tags
  code = code.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (fullTag) => {
    const srcMatch = fullTag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    if (!srcMatch) {
      // Inline script — remove
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
  // Unsafe if any iframe present
  if (/<iframe\b/i.test(input)) return false;

  // Unsafe if any inline event handler present
  if (/on[a-z]+\s*=/i.test(input)) return false;

  // Unsafe if javascript: URLs present
  if (/\b(href|src)\s*=\s*(['"])\s*javascript:/i.test(input)) return false;

  // Unsafe if any non-whitelisted or inline script present
  const scriptTags = input.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const tag of scriptTags) {
    const srcMatch = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    if (!srcMatch) {
      // inline script
      return false;
    }
    const src = srcMatch[1];
    const allowed =
      SCRIPT_WHITELIST_PREFIXES.some((prefix) => src.startsWith(prefix));
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
    /useState/,
    /useEffect/,
    /function\s+\w+\s*\([^)]*\)\s*{[\s\S]*return\s*\(/,
    /<\w+[\s\S]*>/
  ];

  return reactPatterns.some(pattern => pattern.test(code));
}