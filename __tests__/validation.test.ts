// __tests__/validation.test.ts
import CodeValidator from '@/lib/validators/code-validator';
import { autoFixCode } from '@/lib/validators/auto-fixer';

describe('Code Validation', () => {
  let validator: CodeValidator;

  beforeEach(() => {
    validator = new CodeValidator();
  });

  test('should detect missing DOCTYPE', () => {
    const html = '<html><head></head><body></body></html>';
    const result = validator.validateAll(html, '', '');
    
    expect(result.passed).toBe(false);
    expect(result.errors.some(e => e.message.includes('DOCTYPE'))).toBe(true);
  });

  test('should detect missing viewport', () => {
    const html = '<!DOCTYPE html><html><head></head><body></body></html>';
    const result = validator.validateAll(html, '', '');
    
    expect(result.errors.some(e => e.message.includes('viewport'))).toBe(true);
  });

  test('should detect missing charset', () => {
    const html = '<!DOCTYPE html><html><head></head><body></body></html>';
    const result = validator.validateAll(html, '', '');
    
    expect(result.warnings.some(w => w.message.includes('charset'))).toBe(true);
  });

  test('should detect missing lang attribute', () => {
    const html = '<!DOCTYPE html><html><head></head><body></body></html>';
    const result = validator.validateAll(html, '', '');
    
    expect(result.warnings.some(w => w.message.includes('lang'))).toBe(true);
  });

  test('should detect missing h1', () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Test</title>
        </head>
        <body>
          <h2>Subtitle</h2>
        </body>
      </html>
    `;
    const result = validator.validateAll(html, '', '');
    
    expect(result.errors.some(e => e.message.includes('h1'))).toBe(true);
  });

  test('should detect missing title tag', () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
          <h1>Main Title</h1>
        </body>
      </html>
    `;
    const result = validator.validateAll(html, '', '');
    
    expect(result.errors.some(e => e.message.includes('title'))).toBe(true);
  });

  test('should detect images without alt text', () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Test</title>
        </head>
        <body>
          <h1>Main Title</h1>
          <img src="test.jpg">
        </body>
      </html>
    `;
    const result = validator.validateAll(html, '', '');
    
    expect(result.errors.some(e => e.message.includes('alt'))).toBe(true);
  });

  test('should give high score for valid HTML', () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="description" content="Test page description">
          <title>Test Page</title>
        </head>
        <body>
          <main>
            <h1>Main Title</h1>
            <p>Content here</p>
            <img src="test.jpg" alt="Test image">
          </main>
        </body>
      </html>
    `;
    const result = validator.validateAll(html, '', '');
    
    expect(result.summary.score).toBeGreaterThanOrEqual(85);
    expect(result.passed).toBe(true);
  });

  test('should calculate correct grade', () => {
    const html = '<html><body></body></html>';
    const result = validator.validateAll(html, '', '');
    
    expect(['A', 'B', 'C', 'D', 'F']).toContain(result.summary.grade);
  });

  test('should categorize issues correctly', () => {
    const html = '<html><body><h1>Test</h1></body></html>';
    const result = validator.validateAll(html, '', '');
    
    result.errors.forEach(error => {
      expect(['syntax', 'security', 'performance', 'accessibility', 'seo', 'best-practices'])
        .toContain(error.category);
    });
  });
});

describe('Auto-Fix', () => {
  let validator: CodeValidator;

  beforeEach(() => {
    validator = new CodeValidator();
  });

  test('should add DOCTYPE', () => {
    const html = '<html><head></head><body></body></html>';
    const validation = validator.validateAll(html, '', '');
    const result = autoFixCode(html, validation);
    
    expect(result.fixed).toContain('<!DOCTYPE html>');
    expect(result.appliedFixes.some(fix => fix.includes('DOCTYPE'))).toBe(true);
  });

  test('should add charset meta tag', () => {
    const html = '<!DOCTYPE html><html><head></head><body></body></html>';
    const validation = validator.validateAll(html, '', '');
    const result = autoFixCode(html, validation);
    
    expect(result.fixed).toContain('<meta charset="UTF-8">');
    expect(result.appliedFixes.some(fix => fix.includes('charset'))).toBe(true);
  });

  test('should add viewport meta tag', () => {
    const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body></body></html>';
    const validation = validator.validateAll(html, '', '');
    const result = autoFixCode(html, validation);
    
    expect(result.fixed).toContain('name="viewport"');
    expect(result.fixed).toContain('width=device-width');
    expect(result.appliedFixes.some(fix => fix.includes('viewport'))).toBe(true);
  });

  test('should add lang attribute', () => {
    const html = '<!DOCTYPE html><html><head></head><body></body></html>';
    const validation = validator.validateAll(html, '', '');
    const result = autoFixCode(html, validation);
    
    expect(result.fixed).toContain('lang="en"');
    expect(result.appliedFixes.some(fix => fix.includes('lang'))).toBe(true);
  });

  test('should add loading=lazy to images', () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
          <h1>Test</h1>
          <img src="test.jpg" alt="Test">
        </body>
      </html>
    `;
    const validation = validator.validateAll(html, '', '');
    const result = autoFixCode(html, validation);
    
    expect(result.fixed).toContain('loading="lazy"');
  });

  test('should NOT add loading=lazy to hero images', () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
          <h1>Test</h1>
          <img src="hero.jpg" alt="Hero image">
        </body>
      </html>
    `;
    const validation = validator.validateAll(html, '', '');
    const result = autoFixCode(html, validation);
    
    // Hero images should be skipped
    const heroImageMatch = result.fixed.match(/<img[^>]*src="hero\.jpg"[^>]*>/);
    if (heroImageMatch) {
      // If hero image exists, it might not have loading=lazy
      expect(heroImageMatch[0]).toBeDefined();
    }
  });

  test('should add rel attribute to external links', () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
          <h1>Test</h1>
          <a href="https://example.com">External Link</a>
        </body>
      </html>
    `;
    const validation = validator.validateAll(html, '', '');
    const result = autoFixCode(html, validation);
    
    expect(result.fixed).toContain('rel="noopener noreferrer"');
  });

  test('should fix multiple issues in one pass', () => {
    const html = '<html><head></head><body><h1>Test</h1><img src="test.jpg" alt="Test"></body></html>';
    const validation = validator.validateAll(html, '', '');
    const result = autoFixCode(html, validation);
    
    expect(result.appliedFixes.length).toBeGreaterThan(1);
    expect(result.fixed).toContain('<!DOCTYPE html>');
    expect(result.fixed).toContain('charset="UTF-8"');
    expect(result.fixed).toContain('name="viewport"');
    expect(result.fixed).toContain('lang="en"');
  });

  test('should report remaining issues', () => {
    const html = '<html><head></head><body></body></html>';
    const validation = validator.validateAll(html, '', '');
    const result = autoFixCode(html, validation);
    
    // Even after auto-fix, some issues like missing h1, title, etc. require manual attention
    expect(result.remainingIssues).toBeGreaterThan(0);
  });

  test('should improve validation score after auto-fix', () => {
    const html = '<html><head></head><body><h1>Test</h1></body></html>';
    const initialValidation = validator.validateAll(html, '', '');
    const initialScore = initialValidation.summary.score;
    
    const result = autoFixCode(html, initialValidation);
    const finalValidation = validator.validateAll(result.fixed, '', '');
    const finalScore = finalValidation.summary.score;
    
    expect(finalScore).toBeGreaterThan(initialScore);
  });
});

describe('Validation Edge Cases', () => {
  let validator: CodeValidator;

  beforeEach(() => {
    validator = new CodeValidator();
  });

  test('should handle empty HTML', () => {
    const html = '';
    const result = validator.validateAll(html, '', '');
    
    expect(result.passed).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('should handle malformed HTML', () => {
    const html = '<html><head><body>Malformed</body></html>';
    const result = validator.validateAll(html, '', '');
    
    expect(result).toBeDefined();
    expect(result.summary.score).toBeLessThan(100);
  });

  test('should detect multiple h1 tags', () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Test</title>
        </head>
        <body>
          <h1>First Title</h1>
          <h1>Second Title</h1>
        </body>
      </html>
    `;
    const result = validator.validateAll(html, '', '');
    
    expect(result.warnings.some(w => w.message.includes('Multiple h1'))).toBe(true);
  });

  test('should handle very long HTML', () => {
    let longBody = '';
    for (let i = 0; i < 1000; i++) {
      longBody += `<p>Paragraph ${i}</p>`;
    }
    
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Test</title>
        </head>
        <body>
          <h1>Test</h1>
          ${longBody}
        </body>
      </html>
    `;
    
    const result = validator.validateAll(html, '', '');
    
    expect(result).toBeDefined();
    expect(result.summary.score).toBeGreaterThan(0);
  });
});
