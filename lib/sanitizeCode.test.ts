import { sanitizeCode, isCodeSafe } from './sanitizeCode';

describe('sanitizeCode', () => {
  it('should remove iframe tags', () => {
    const input = '<h1>Hello</h1><iframe src="evil.com"></iframe>';
    const result = sanitizeCode(input);
    expect(result).not.toContain('iframe');
  });

  it('should remove malicious script tags', () => {
    const input = '<script src="https://evil.com/hack.js"></script><p>Safe</p>';
    const result = sanitizeCode(input);
    expect(result).not.toContain('evil.com');
  });

  it('should keep whitelisted CDN scripts', () => {
    const input = '<script src="https://cdn.tailwindcss.com/tailwind.css"></script>';
    const result = sanitizeCode(input);
    expect(result).toContain('cdn.tailwindcss.com');
  });

  it('should remove inline event handlers', () => {
    const input = '<button onclick="alert(\'xss\')">Click</button>';
    const result = sanitizeCode(input);
    expect(result).not.toContain('onclick');
  });
});

describe('isCodeSafe', () => {
  it('should detect unsafe iframe', () => {
    expect(isCodeSafe('<iframe src="evil.com"></iframe>')).toBe(false);
  });

  it('should allow safe code', () => {
    expect(isCodeSafe('<h1>Hello</h1><p>Safe content</p>')).toBe(true);
  });
});
