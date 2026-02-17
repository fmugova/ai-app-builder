import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Strip markdown code fences from generated code
 * This is critical because AI often wraps code in ```html, ```javascript, etc.
 */
export function stripMarkdownCodeFences(code: string): string {
  
  // Remove markdown code fences (```html, ```javascript, etc.)
  let cleaned = code
    .replace(/^```html\s*\n?/gm, '')
    .replace(/^```javascript\s*\n?/gm, '')
    .replace(/^```js\s*\n?/gm, '')
    .replace(/^```css\s*\n?/gm, '')
    .replace(/^```typescript\s*\n?/gm, '')
    .replace(/^```ts\s*\n?/gm, '')
    .replace(/^```\s*\n?/gm, '')
    .replace(/\n?```\s*$/gm, '');
  
  const hadFences = code.length !== cleaned.length;
  
  if (hadFences && typeof window === 'undefined') {
    // Only log on server to avoid flooding browser console during streaming
    console.log('✅ Code cleaned:', code.length - cleaned.length, 'chars removed');
  }
  
  return cleaned.trim();
}
