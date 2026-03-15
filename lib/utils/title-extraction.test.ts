import {
  extractTitleFromPrompt,
  extractTitleFromResponse,
  removeTitleTags,
  extractProjectTitle,
} from './title-extraction'

describe('extractTitleFromPrompt', () => {
  // ── Edge cases ───────────────────────────────────────────────────────────────
  describe('edge cases', () => {
    it('returns "Untitled Project" for empty string', () => {
      expect(extractTitleFromPrompt('')).toBe('Untitled Project')
    })

    it('returns "Untitled Project" for null', () => {
      // @ts-expect-error testing runtime guard
      expect(extractTitleFromPrompt(null)).toBe('Untitled Project')
    })

    it('returns "Untitled Project" for non-string', () => {
      // @ts-expect-error testing runtime guard
      expect(extractTitleFromPrompt(42)).toBe('Untitled Project')
    })

    it('truncates result to 50 characters max', () => {
      const longPrompt = 'Build a incredible super duper awesome mega platform application system manager'
      const result = extractTitleFromPrompt(longPrompt)
      expect(result.length).toBeLessThanOrEqual(50)
    })
  })

  // ── Pattern 1: "create a TYPE for SUBJECT" ───────────────────────────────────
  describe('Pattern 1 – "create a TYPE for SUBJECT"', () => {
    it('extracts title from "create a landing page for a coffee shop"', () => {
      const result = extractTitleFromPrompt('Create a landing page for a coffee shop with home, menu')
      expect(result).toMatch(/coffee/i)
    })

    it('extracts title from "create a website for a restaurant"', () => {
      const result = extractTitleFromPrompt('Create a website for a restaurant with menu and booking')
      expect(result).toMatch(/restaurant/i)
    })
  })

  // ── Pattern 2: "build a SUBJECT TYPE" ────────────────────────────────────────
  describe('Pattern 2 – "build a SUBJECT TYPE"', () => {
    it('extracts title from "build a tax calculator app"', () => {
      const result = extractTitleFromPrompt('Build a tax calculator app')
      expect(result).toMatch(/tax/i)
      expect(result).toMatch(/app/i)
    })

    it('extracts title from "build a fitness tracking app"', () => {
      const result = extractTitleFromPrompt('Build a fitness tracking app')
      expect(result).toMatch(/fitness/i)
    })
  })

  // ── Pattern 3: direct "[SUBJECT] [TYPE]" ─────────────────────────────────────
  describe('Pattern 3 – direct "SUBJECT TYPE"', () => {
    it('extracts title from "freelancer tax estimator"', () => {
      const result = extractTitleFromPrompt('Freelancer tax estimator with deductions')
      expect(result).toMatch(/tax estimator/i)
    })

    it('extracts title from "project management app"', () => {
      const result = extractTitleFromPrompt('Project management app')
      expect(result).toMatch(/project management app/i)
    })
  })

  // ── Pattern 4: domain-specific keywords ──────────────────────────────────────
  describe('Pattern 4 – domain keywords', () => {
    it('returns "Tax Estimator" for tax-related prompt', () => {
      // Pattern 3: subject='tax', type='estimator'
      const result = extractTitleFromPrompt('tax estimator for freelancers')
      expect(result).toBe('Tax Estimator')
    })

    it('returns "Coffee Shop Website" for coffee shop prompt', () => {
      // Pattern 4 domain keyword: no valid type word in prompt
      const result = extractTitleFromPrompt('Simple coffee shop page')
      expect(result).toBe('Coffee Shop Website')
    })

    it('returns "E-Commerce Platform" for e-commerce prompt', () => {
      // Pattern 4 domain keyword
      const result = extractTitleFromPrompt('E-commerce admin panel')
      expect(result).toBe('E-Commerce Platform')
    })

    it('returns "CRM Dashboard" for CRM prompt', () => {
      // Pattern 4: no type word → falls through to domain keywords
      const result = extractTitleFromPrompt('crm for contacts')
      expect(result).toBe('CRM Dashboard')
    })

    it('returns "Portfolio Website" for portfolio prompt', () => {
      // Pattern 4: 'gallery' not in type list → falls through to domain keywords
      const result = extractTitleFromPrompt('portfolio gallery')
      expect(result).toBe('Portfolio Website')
    })

    it('returns "Blog Platform" for blog prompt', () => {
      // Pattern 4: no type word → domain keyword '/blog/'
      const result = extractTitleFromPrompt('Create a blog with posts and categories')
      expect(result).toBe('Blog Platform')
    })

    it('returns "Inventory System" for inventory prompt', () => {
      // Pattern 4: 'tool' not in type list → falls through to domain keywords
      const result = extractTitleFromPrompt('Inventory tracking tool')
      expect(result).toBe('Inventory System')
    })

    it('returns "Social Dashboard" for social media prompt', () => {
      // Pattern 4: 'feeds' not in type list → falls through to domain keywords
      const result = extractTitleFromPrompt('social media feeds')
      expect(result).toBe('Social Dashboard')
    })

    it('returns "Finance Dashboard" for finance prompt', () => {
      // Pattern 3: subject='finance', type='dashboard'
      const result = extractTitleFromPrompt('finance dashboard insights')
      expect(result).toBe('Finance Dashboard')
    })

    it('returns "Project Manager" for project management prompt', () => {
      // Pattern 4: 'for' / 'teams' not in type list → falls through to domain keywords
      const result = extractTitleFromPrompt('project management for teams')
      expect(result).toBe('Project Manager')
    })
  })

  // ── Proper casing ─────────────────────────────────────────────────────────────
  describe('capitalization', () => {
    it('capitalizes output words', () => {
      const result = extractTitleFromPrompt('simple landing page')
      expect(result[0]).toBe(result[0].toUpperCase())
    })
  })
})

describe('extractTitleFromResponse', () => {
  it('returns null for empty string', () => {
    expect(extractTitleFromResponse('')).toBeNull()
  })

  it('returns null when no title tag present', () => {
    expect(extractTitleFromResponse('<html><body>Hello</body></html>')).toBeNull()
  })

  it('extracts title from <PROJECT_TITLE> tag', () => {
    const response = '<PROJECT_TITLE>My Awesome App</PROJECT_TITLE>\n<html>...</html>'
    expect(extractTitleFromResponse(response)).toBe('My Awesome App')
  })

  it('is case-insensitive for <PROJECT_TITLE> tag', () => {
    const response = '<project_title>Lower Case Tag</project_title>'
    expect(extractTitleFromResponse(response)).toBe('Lower Case Tag')
  })

  it('falls back to <title> HTML tag when no PROJECT_TITLE', () => {
    const response = '<html><head><title>My Site</title></head></html>'
    expect(extractTitleFromResponse(response)).toBe('My Site')
  })

  it('strips trailing separators from <title> tag', () => {
    const response = '<title>Dashboard - App</title>'
    const result = extractTitleFromResponse(response)
    expect(result).not.toMatch(/-\s*App\s*$/)
  })

  it('truncates to 50 characters', () => {
    const longTitle = 'A'.repeat(60)
    const response = `<PROJECT_TITLE>${longTitle}</PROJECT_TITLE>`
    const result = extractTitleFromResponse(response)
    expect(result!.length).toBeLessThanOrEqual(50)
  })

  it('trims whitespace from extracted title', () => {
    const response = '<PROJECT_TITLE>  Trimmed Title  </PROJECT_TITLE>'
    expect(extractTitleFromResponse(response)).toBe('Trimmed Title')
  })
})

describe('removeTitleTags', () => {
  it('removes <PROJECT_TITLE> tags from response', () => {
    const response = '<PROJECT_TITLE>My App</PROJECT_TITLE>\nSome code here'
    const result = removeTitleTags(response)
    expect(result).not.toContain('<PROJECT_TITLE>')
    expect(result).not.toContain('My App')
    expect(result).toContain('Some code here')
  })

  it('returns unchanged string when no tags present', () => {
    const response = 'Just some plain text'
    expect(removeTitleTags(response)).toBe('Just some plain text')
  })

  it('handles multiple PROJECT_TITLE tags', () => {
    const response = '<PROJECT_TITLE>First</PROJECT_TITLE>\n<PROJECT_TITLE>Second</PROJECT_TITLE>\nCode'
    const result = removeTitleTags(response)
    expect(result).not.toContain('PROJECT_TITLE')
    expect(result).toContain('Code')
  })

  it('trims leading/trailing whitespace after removal', () => {
    const response = '<PROJECT_TITLE>Title</PROJECT_TITLE>   \nContent'
    const result = removeTitleTags(response)
    expect(result.startsWith(' ')).toBe(false)
  })
})

describe('extractProjectTitle', () => {
  it('uses AI response title when available', () => {
    const result = extractProjectTitle(
      'Build me a blog',
      '<PROJECT_TITLE>My Blog</PROJECT_TITLE>\n<html>...</html>'
    )
    expect(result).toBe('My Blog')
  })

  it('falls back to prompt when AI response has no title tag', () => {
    const result = extractProjectTitle(
      'Build a tax calculator app',
      '<html>some response without title tag</html>'
    )
    expect(result).toMatch(/tax/i)
  })

  it('uses prompt when aiResponse is undefined', () => {
    const result = extractProjectTitle('Portfolio website')
    expect(result).toBe('Portfolio Website')
  })

  it('uses prompt when aiResponse is empty', () => {
    // 'crm for contacts' has no TYPE word → Pattern 4 → 'CRM Dashboard'
    const result = extractProjectTitle('crm for contacts', '')
    expect(result).toBe('CRM Dashboard')
  })
})
