# Bundle Size Optimization Guide 📦

## Current Setup ✅

### Bundle Analyzer Installed
- Package: `@next/bundle-analyzer` v16.0.9
- Configuration: Already in `next.config.js`
- Build running with analysis enabled

## How to Use Bundle Analyzer

### 1. Quick Analysis (New Script Added!)
```bash
npm run analyze
```

### 2. Manual Analysis
```bash
# PowerShell
$env:ANALYZE='true'; npm run build

# Bash/Linux
ANALYZE=true npm run build
```

### 3. What Happens
- Build completes normally
- Opens 2 HTML files in your browser:
  - `client.html` - Client-side bundle visualization
  - `server.html` - Server-side bundle visualization
- Interactive treemap shows bundle composition

## Optimization Strategies 🚀

### Already Implemented ✅

1. **Image Optimization**
   - AVIF & WebP formats
   - Responsive device sizes
   - Minimum cache TTL

2. **Font Optimization**
   - Display swap enabled
   - Preload enabled
   - Only necessary weights loaded
   - CSS variables for fallback

3. **Code Splitting**
   - Lazy loading components (`LazyComponents.tsx`)
   - Dynamic imports for heavy features
   - Suspense boundaries with skeletons

4. **Compression**
   - SWC minification enabled
   - Gzip/Brotli compression
   - CSS optimization (experimental)

### Additional Optimizations to Consider

#### 1. Tree Shaking Unused Code
```javascript
// In next.config.js - experimental
experimental: {
  optimizePackageImports: ['@radix-ui', 'lucide-react', 'recharts'],
}
```

#### 2. Reduce Third-Party Scripts
Current heavy dependencies (check with analyzer):
- `@prisma/client` - Keep (necessary)
- `next-auth` - Keep (necessary)
- `recharts` - Already lazy loaded ✅
- `@radix-ui/*` - Consider tree shaking

#### 3. Split Large Pages
If any route exceeds 244KB (warning threshold):
```tsx
// Instead of importing everything
import { Component1, Component2, Component3 } from './components'

// Lazy load heavy components
const Component3 = dynamic(() => import('./components/Component3'))
```

#### 4. Optimize Images Further
```tsx
// Use Next.js Image component everywhere
import Image from 'next/image'

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={630}
  priority={false} // Only set true for above-fold images
  loading="lazy"
  placeholder="blur"
/>
```

#### 5. Remove Unused Dependencies
After bundle analysis, check for:
- Unused npm packages
- Duplicate dependencies (multiple versions)
- Heavy packages that can be replaced

## Reading Bundle Analysis

### What to Look For

1. **Large Packages** (Red flags if >100KB)
   - Can they be lazy loaded?
   - Are they all necessary?
   - Can you use a lighter alternative?

2. **Duplicate Code**
   - Same package imported multiple times
   - Different versions of same package
   - Fix: `npm dedupe`

3. **Route Bundles**
   - Initial page load (should be <244KB)
   - Route-specific bundles
   - Shared chunks

### Ideal Bundle Sizes

- **First Load JS**: <200KB (target)
- **Page-specific**: <50KB per route
- **Shared chunks**: Balanced (not too many, not too few)

## Performance Metrics to Monitor

After optimization, check:

```bash
npm run build
```

Look for:
- ✅ Green: Good (<244KB)
- ⚠️ Yellow: Warning (244-488KB)
- 🔴 Red: Poor (>488KB)

## Common Issues & Fixes

### Issue: Large Client Bundle
**Fix**: Move server-only code to API routes or server components

### Issue: Duplicate Dependencies
**Fix**: 
```bash
npm dedupe
npm install
```

### Issue: Heavy Third-Party Libraries
**Fix**: Use dynamic imports
```tsx
const HeavyLib = dynamic(() => import('heavy-library'), {
  ssr: false,
  loading: () => <LoadingSkeleton />
})
```

### Issue: All Routes Loading Same Code
**Fix**: Split shared code into smaller chunks
```javascript
// next.config.js
experimental: {
  optimizePackageImports: ['package-name'],
}
```

## Next Steps After Analysis

1. **Review the HTML reports** that opened in your browser
2. **Identify largest packages** (usually shown in red/dark colors)
3. **Check route bundles** - Are any routes exceptionally large?
4. **Look for duplicates** - Same package multiple times
5. **Implement lazy loading** for heavy components found
6. **Remove unused dependencies**
7. **Re-run analysis** to verify improvements

## Automated Bundle Monitoring

### Set Budget Limits
```javascript
// next.config.js
webpack: (config) => {
  config.performance = {
    maxAssetSize: 244000, // 244KB
    maxEntrypointSize: 244000,
  }
  return config
}
```

### CI/CD Integration
```yaml
# .github/workflows/bundle-size.yml
- name: Analyze bundle
  run: npm run analyze
- name: Check bundle size
  run: npx size-limit
```

## Resources

- 📊 [Bundle Analyzer Docs](https://www.npmjs.com/package/@next/bundle-analyzer)
- 🚀 [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- 💡 [Web Vitals](https://web.dev/vitals/)

---

**Build currently running...**
Check your browser for the interactive bundle analysis reports!
