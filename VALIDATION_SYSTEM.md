# Code Validation & Auto-Fix System

## Overview

BuildFlow AI now includes a comprehensive code validation and auto-fixing system that ensures generated code meets production-ready standards for HTML/SEO/accessibility.

## Components

### 1. Code Validator (`lib/validators/code-validator.ts`)

Comprehensive validation with 23+ checks:

**HTML Structure:**
- DOCTYPE declaration
- Charset UTF-8
- Viewport meta tag
- Lang attribute
- Title tag
- Exactly one H1
- Proper heading hierarchy
- Meta description

**SEO:**
- Open Graph tags
- Title and description
- Proper meta tags

**Accessibility:**
- Alt text on images
- Form input labels
- Descriptive link text
- Button accessibility
- Color contrast (basic check)

**Performance:**
- Lazy loading images
- External script optimization

**Security:**
- External link rel attributes
- XSS prevention (innerHTML detection)
- No hardcoded API keys

### 2. Auto-Fixer (`lib/validators/auto-fixer.ts`)

Automatically fixes 6 common issues:

1. **DOCTYPE** - Adds `<!DOCTYPE html>` at beginning
2. **Charset** - Inserts `<meta charset="UTF-8">` in head
3. **Viewport** - Adds viewport meta tag for mobile
4. **Lang attribute** - Adds `lang="en"` to html tag
5. **Lazy loading** - Adds `loading="lazy"` to images (smart: skips hero/logo/banner)
6. **External links** - Adds `rel="noopener noreferrer"` to external links

### 3. UI Component (`components/CodeQualityReport.tsx`)

Beautiful React component showing:
- Overall quality score (0-100)
- Grade (A/B/C/D/F)
- Error/Warning/Info counts
- Expandable issue list with fix suggestions
- Auto-fix button
- Applied fixes display

## Integration

### In Generation Pipeline

The chatbot stream route (`app/api/chatbot/stream/route.ts`) automatically:

1. **Validates** generated code
2. **Auto-fixes** common issues if score < 100
3. **Re-validates** after auto-fix
4. **Returns** validation results + auto-fix info to client

```typescript
// Automatic in generation pipeline
const validationResult = validator.validateAll(html, css, '');

// Auto-fix if needed
if (!validationResult.passed) {
  const autoFix = autoFixCode(html, validationResult);
  html = autoFix.fixed; // Update with fixed version
}
```

### In UI

Use the `CodeQualityReport` component:

```tsx
import CodeQualityReport from '@/components/CodeQualityReport';

<CodeQualityReport
  validationResult={validation}
  onAutoFix={handleAutoFix}
  isFixing={isFixing}
  autoFixResult={autoFixResult}
/>
```

### API Endpoints

Two new endpoints for manual validation:

**Validate:**
```bash
POST /api/validate-code
{
  "code": "<html>...</html>"
}
```

**Auto-Fix:**
```bash
POST /api/auto-fix
{
  "code": "<html>...</html>",
  "validation": { ... }
}
```

## Example Usage

Visit `/validation-example` to see a live demo with:
- Code editor
- Validate button
- Quality report
- Auto-fix button
- Before/after comparison

## Scoring System

The validator uses weighted penalties:

**Errors:**
- Critical: -15 points (auto-fail)
- High: -10 points
- Medium: -5 points
- Low: -2 points

**Warnings:**
- -2 to -10 based on severity

**Info:**
- -1 to -5 based on severity

**Grades:**
- A: 90-100 (Excellent)
- B: 80-89 (Good)
- C: 70-79 (Fair)
- D: 60-69 (Needs Improvement)
- F: <60 (Failed)

**Auto-fail conditions:**
- Any critical error
- Score < 70

## Testing

Run the test suite:

```bash
npm test lib/validators/code-validator.test.ts
```

## Future Enhancements

1. **More Auto-Fixes:**
   - Add h1 tags automatically
   - Generate alt text suggestions
   - Fix heading hierarchy

2. **AI-Powered Fixes:**
   - Use Claude to generate missing content
   - Suggest SEO improvements
   - Accessibility enhancements

3. **Performance Monitoring:**
   - Track validation scores over time
   - Show improvement trends
   - Compare with best practices

4. **Custom Rules:**
   - User-defined validation rules
   - Project-specific requirements
   - Team standards enforcement

## Integration Checklist

- [x] Enhanced code validator with 23+ checks
- [x] Auto-fixer for 6 common issues
- [x] UI component with tabs and expansion
- [x] Integration in generation pipeline
- [x] API endpoints for manual validation
- [x] Example page with live demo
- [x] Console logging for debugging
- [x] Error handling
- [x] TypeScript types
- [x] Documentation

## Notes

- Auto-fix runs automatically during generation if validation fails
- Smart heuristics skip lazy loading for above-fold images (hero, logo, banner)
- All fixes are transparent and logged to console
- Validation results include actionable fix suggestions
- Component supports dark mode via Tailwind
