import { generateSmartProjectName, generateProjectSlug } from './project-name-generator'

describe('generateSmartProjectName', () => {
  // ── Edge cases ───────────────────────────────────────────────────────────────
  describe('edge cases', () => {
    it('returns "Untitled Project" for empty string', () => {
      expect(generateSmartProjectName('')).toBe('Untitled Project')
    })

    it('returns "Untitled Project" for whitespace-only string', () => {
      expect(generateSmartProjectName('   ')).toBe('Untitled Project')
    })

    it('truncates names longer than 50 characters with "..."', () => {
      const longPrompt = 'A stunning and beautiful animated portfolio website for creative professionals'
      const result = generateSmartProjectName(longPrompt)
      expect(result.length).toBeLessThanOrEqual(53) // 47 + "..."
    })
  })

  // ── AI response prefix stripping ─────────────────────────────────────────────
  describe('strips AI-response prefixes', () => {
    it('strips "I\'ll create a" prefix', () => {
      const result = generateSmartProjectName("I'll create a coffee shop website with menu and contact sections")
      expect(result).toMatch(/coffee shop website/i)
    })

    it('strips "I will create a" prefix', () => {
      const result = generateSmartProjectName("I will create a portfolio website")
      expect(result).toMatch(/portfolio website/i)
    })

    it('strips "Here\'s a" prefix', () => {
      const result = generateSmartProjectName("Here's a landing page for a startup")
      expect(result.length).toBeGreaterThan(0)
    })

    it('strips "Build me" prefix', () => {
      const result = generateSmartProjectName("Build me a portfolio website")
      expect(result).toMatch(/portfolio website/i)
    })
  })

  // ── Keyword-based extraction ─────────────────────────────────────────────────
  describe('keyword-based extraction', () => {
    it('extracts "Coffee Shop Website"', () => {
      const result = generateSmartProjectName('a coffee shop website')
      expect(result).toMatch(/coffee shop website/i)
    })

    it('extracts "Portfolio Website"', () => {
      const result = generateSmartProjectName('Portfolio website with projects and contact')
      expect(result).toMatch(/portfolio website/i)
    })

    it('extracts "Task Management App"', () => {
      const result = generateSmartProjectName('Create a task management app')
      expect(result).toMatch(/task management app/i)
    })

    it('extracts "Landing Page" from simple landing page prompt', () => {
      const result = generateSmartProjectName('landing page for a startup with hero section')
      expect(result).toMatch(/landing page/i)
    })

    it('extracts multi-page website name', () => {
      const result = generateSmartProjectName('multi-page website with home, about, services')
      expect(result).toMatch(/website/i)
    })

    it('extracts dashboard name', () => {
      const result = generateSmartProjectName('analytics dashboard for tracking user metrics')
      expect(result).toMatch(/dashboard/i)
    })
  })

  // ── Capitalization ────────────────────────────────────────────────────────────
  describe('capitalization', () => {
    it('capitalizes each word', () => {
      const result = generateSmartProjectName('simple portfolio website')
      const words = result.split(' ')
      for (const word of words) {
        if (word.length > 0) {
          expect(word[0]).toBe(word[0].toUpperCase())
        }
      }
    })
  })
})

describe('generateProjectSlug', () => {
  it('lowercases the name', () => {
    expect(generateProjectSlug('My Portfolio')).toBe('my-portfolio')
  })

  it('replaces spaces with hyphens', () => {
    expect(generateProjectSlug('Coffee Shop Website')).toBe('coffee-shop-website')
  })

  it('removes special characters', () => {
    expect(generateProjectSlug('E-Commerce! App')).toBe('e-commerce-app')
  })

  it('collapses multiple hyphens into one', () => {
    expect(generateProjectSlug('Hello---World')).toBe('hello-world')
  })

  it('strips leading/trailing hyphens', () => {
    expect(generateProjectSlug('-My App-')).toBe('my-app')
  })

  it('truncates to 60 characters', () => {
    const longName = 'A'.repeat(70)
    expect(generateProjectSlug(longName).length).toBeLessThanOrEqual(60)
  })

  it('returns "project" for empty/non-slug input', () => {
    expect(generateProjectSlug('')).toBe('project')
  })

  it('returns "project" for input with only special characters', () => {
    expect(generateProjectSlug('!!!###')).toBe('project')
  })

  it('preserves existing hyphens in names', () => {
    const slug = generateProjectSlug('Multi-Page Website')
    expect(slug).toContain('-')
    expect(slug).toMatch(/^[a-z0-9-]+$/)
  })
})
