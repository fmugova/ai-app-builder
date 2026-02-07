// lib/validation/codeValidator.ts
// Production-ready code validator with comprehensive checks and auto-fix support

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: 'html' | 'seo' | 'accessibility' | 'performance' | 'css';
  message: string;
  fix?: string;
  line?: number;
  autoFixable: boolean;
}

export interface ValidationResult {
  passed: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

export class CodeValidator {
  private issues: ValidationIssue[] = [];

  validate(html: string): ValidationResult {
    this.issues = [];

    // Run all validation checks
    this.validateDoctype(html);
    this.validateCharset(html);
    this.validateViewport(html);
    this.validateLangAttribute(html);
    this.validateHeadings(html);
    this.validateMetaTags(html);
    this.validateCSSVariables(html);
    this.validateSemanticHTML(html);
    this.validateAccessibility(html);
    this.validateImages(html);
    this.validateLinks(html);
    this.validateForms(html);
    this.validatePerformance(html);

    return this.generateResult();
  }

  private validateDoctype(html: string): void {
    if (!html.trim().startsWith('<!DOCTYPE html>')) {
      this.issues.push({
        type: 'error',
        category: 'html',
        message: 'Missing or incorrect DOCTYPE declaration',
        fix: 'Add <!DOCTYPE html> at the beginning of the file',
        autoFixable: true,
      });
    }
  }

  private validateCharset(html: string): void {
    if (!html.includes('<meta charset="UTF-8">')) {
      this.issues.push({
        type: 'error',
        category: 'html',
        message: 'Missing charset declaration',
        fix: 'Add <meta charset="UTF-8"> in <head>',
        autoFixable: true,
      });
    }
  }

  private validateViewport(html: string): void {
    const hasViewport = html.includes('name="viewport"');
    if (!hasViewport) {
      this.issues.push({
        type: 'error',
        category: 'html',
        message: 'Missing viewport meta tag for mobile responsiveness',
        fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        autoFixable: true,
      });
    }
  }

  private validateLangAttribute(html: string): void {
    const htmlTagMatch = html.match(/<html[^>]*>/);
    if (htmlTagMatch && !htmlTagMatch[0].includes('lang=')) {
      this.issues.push({
        type: 'warning',
        category: 'accessibility',
        message: 'Missing lang attribute on <html> tag',
        fix: 'Add lang="en" to <html> tag for screen readers',
        autoFixable: true,
      });
    }
  }

  private validateHeadings(html: string): void {
    // Check h1 count
    const h1Matches = html.match(/<h1[^>]*>.*?<\/h1>/gs);
    const h1Count = h1Matches ? h1Matches.length : 0;

    if (h1Count === 0) {
      this.issues.push({
        type: 'error',
        category: 'seo',
        message: 'Missing h1 heading - every page should have one main heading',
        fix: 'Add <h1>Your Page Title</h1> as the main heading',
        autoFixable: false,
      });
    } else if (h1Count > 1) {
      this.issues.push({
        type: 'warning',
        category: 'seo',
        message: `Found ${h1Count} h1 headings - should only have one per page`,
        fix: 'Use only one <h1> for the main title, use <h2>-<h6> for subheadings',
        autoFixable: false,
      });
    }

    // Check heading hierarchy
    const headings = this.extractHeadingLevels(html);
    if (headings.length > 1) {
      for (let i = 1; i < headings.length; i++) {
        if (headings[i] - headings[i - 1] > 1) {
          this.issues.push({
            type: 'warning',
            category: 'accessibility',
            message: `Skipped heading level: h${headings[i - 1]} to h${headings[i]}`,
            fix: 'Follow proper heading hierarchy without skipping levels',
            autoFixable: false,
          });
          break;
        }
      }
    }
  }

  private extractHeadingLevels(html: string): number[] {
    const headingMatches = html.match(/<h([1-6])[^>]*>/g);
    if (!headingMatches) return [];
    
    return headingMatches
      .map(match => parseInt(match.match(/h([1-6])/)?.[1] || '0'))
      .filter(level => level > 0);
  }

  private validateMetaTags(html: string): void {
    // Check for title tag
    if (!html.match(/<title>.*?<\/title>/)) {
      this.issues.push({
        type: 'error',
        category: 'seo',
        message: 'Missing <title> tag',
        fix: 'Add <title>Your Page Title</title> in <head>',
        autoFixable: false,
      });
    }

    // Check for meta description
    if (!html.includes('name="description"')) {
      this.issues.push({
        type: 'warning',
        category: 'seo',
        message: 'Missing meta description for SEO',
        fix: 'Add <meta name="description" content="Your page description">',
        autoFixable: false,
      });
    }

    // Check for Open Graph tags
    if (!html.includes('property="og:')) {
      this.issues.push({
        type: 'info',
        category: 'seo',
        message: 'Missing Open Graph tags for social media sharing',
        fix: 'Add og:title, og:description, og:image meta tags',
        autoFixable: false,
      });
    }
  }

  private validateCSSVariables(html: string): void {
    const hasStyleTag = html.includes('<style');
    const hasCSSVars = html.includes(':root') && html.includes('--');
    
    if (hasStyleTag && !hasCSSVars) {
      this.issues.push({
        type: 'warning',
        category: 'css',
        message: 'Consider using CSS custom properties (variables) for maintainability',
        fix: 'Define variables in :root for colors, spacing, fonts, etc.',
        autoFixable: false,
      });
    }
  }

  private validateSemanticHTML(html: string): void {
    const semanticTags = ['<main', '<header', '<footer', '<nav', '<article', '<section'];
    const hasSemanticTags = semanticTags.some(tag => html.includes(tag));

    if (!hasSemanticTags) {
      this.issues.push({
        type: 'warning',
        category: 'accessibility',
        message: 'Missing semantic HTML5 elements',
        fix: 'Use <main>, <header>, <footer>, <nav>, etc. instead of generic <div>',
        autoFixable: false,
      });
    }

    if (!html.includes('<main')) {
      this.issues.push({
        type: 'warning',
        category: 'accessibility',
        message: 'Missing <main> element for main content',
        fix: 'Wrap primary content in <main> tag',
        autoFixable: false,
      });
    }
  }

  private validateAccessibility(html: string): void {
    // Check for ARIA labels on buttons without text
    const buttonMatches = html.match(/<button[^>]*>.*?<\/button>/gs);
    if (buttonMatches) {
      buttonMatches.forEach(button => {
        const hasText = button.match(/<button[^>]*>(.*?)<\/button>/s)?.[1]?.trim();
        const hasAriaLabel = button.includes('aria-label=');
        
        if (!hasText && !hasAriaLabel) {
          this.issues.push({
            type: 'warning',
            category: 'accessibility',
            message: 'Button without text or aria-label',
            fix: 'Add text content or aria-label to buttons',
            autoFixable: false,
          });
        }
      });
    }

    // Check for focus styles
    if (!html.includes('focus:') && !html.includes(':focus')) {
      this.issues.push({
        type: 'warning',
        category: 'accessibility',
        message: 'Missing focus styles for keyboard navigation',
        fix: 'Add visible focus states to interactive elements',
        autoFixable: false,
      });
    }
  }

  private validateImages(html: string): void {
    const imgMatches = html.match(/<img[^>]*>/g);
    if (!imgMatches) return;

    let imagesWithoutAlt = 0;
    let imagesWithoutLoading = 0;

    imgMatches.forEach(img => {
      if (!img.includes('alt=')) {
        imagesWithoutAlt++;
      }
      if (!img.includes('loading=')) {
        imagesWithoutLoading++;
      }
    });

    if (imagesWithoutAlt > 0) {
      this.issues.push({
        type: 'error',
        category: 'accessibility',
        message: `${imagesWithoutAlt} image(s) missing alt attribute`,
        fix: 'Add descriptive alt text to all images',
        autoFixable: false,
      });
    }

    if (imagesWithoutLoading > 0) {
      this.issues.push({
        type: 'info',
        category: 'performance',
        message: `${imagesWithoutLoading} image(s) missing lazy loading`,
        fix: 'Add loading="lazy" to images below the fold',
        autoFixable: true,
      });
    }
  }

  private validateLinks(html: string): void {
    const linkMatches = html.match(/<a[^>]*>.*?<\/a>/gs);
    if (!linkMatches) return;

    linkMatches.forEach(link => {
      const linkText = link.match(/<a[^>]*>(.*?)<\/a>/s)?.[1]?.trim();
      const genericTexts = ['click here', 'read more', 'here', 'more'];
      
      if (linkText && genericTexts.includes(linkText.toLowerCase())) {
        this.issues.push({
          type: 'warning',
          category: 'accessibility',
          message: `Link with generic text: "${linkText}"`,
          fix: 'Use descriptive link text instead of "click here" or "read more"',
          autoFixable: false,
        });
      }

      // Check for external links without rel attributes
      if (link.includes('href="http') && !link.includes('rel=')) {
        this.issues.push({
          type: 'info',
          category: 'html',
          message: 'External link missing rel attribute',
          fix: 'Add rel="noopener noreferrer" to external links',
          autoFixable: true,
        });
      }
    });
  }

  private validateForms(html: string): void {
    const inputMatches = html.match(/<input[^>]*>/g);
    if (!inputMatches) return;

    inputMatches.forEach(input => {
      const hasId = input.includes('id=');
      const type = input.match(/type="([^"]*)"/)?.[1];
      
      if (!hasId && type !== 'submit' && type !== 'button') {
        this.issues.push({
          type: 'warning',
          category: 'accessibility',
          message: 'Form input missing id for label association',
          fix: 'Add id to inputs and associate with <label for="...">',
          autoFixable: false,
        });
      }
    });
  }

  private validatePerformance(html: string): void {
    // Check for inline styles
    const inlineStyleCount = (html.match(/style="/g) || []).length;
    if (inlineStyleCount > 5) {
      this.issues.push({
        type: 'info',
        category: 'performance',
        message: `${inlineStyleCount} inline style attributes found`,
        fix: 'Move styles to CSS classes for better caching',
        autoFixable: false,
      });
    }

    // Check for large inline scripts
    const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gs);
    if (scriptMatches) {
      scriptMatches.forEach(script => {
        if (script.length > 5000) {
          this.issues.push({
            type: 'warning',
            category: 'performance',
            message: 'Large inline script detected',
            fix: 'Extract large scripts to external files',
            autoFixable: false,
          });
        }
      });
    }
  }

  private generateResult(): ValidationResult {
    const errors = this.issues.filter(i => i.type === 'error').length;
    const warnings = this.issues.filter(i => i.type === 'warning').length;
    const info = this.issues.filter(i => i.type === 'info').length;

    // Calculate score (100 - penalties)
    let score = 100;
    score -= errors * 10;  // -10 points per error
    score -= warnings * 3; // -3 points per warning
    score -= info * 1;     // -1 point per info
    score = Math.max(0, score);

    return {
      passed: errors === 0,
      score,
      issues: this.issues,
      summary: { errors, warnings, info },
    };
  }
}

// Factory function
export function validateCode(html: string): ValidationResult {
  const validator = new CodeValidator();
  return validator.validate(html);
}
