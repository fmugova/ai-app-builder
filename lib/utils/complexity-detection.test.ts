import { detectComplexity } from './complexity-detection'

describe('detectComplexity', () => {
  // ── Edge cases ──────────────────────────────────────────────────────────────
  describe('edge cases', () => {
    it('returns simple-html with confidence 50 for empty string', () => {
      const result = detectComplexity('')
      expect(result.mode).toBe('simple-html')
      expect(result.confidence).toBe(50)
      expect(result.detectedFeatures).toEqual([])
    })

    it('returns simple-html with confidence 50 for null-like input', () => {
      // @ts-expect-error testing runtime guard
      const result = detectComplexity(null)
      expect(result.mode).toBe('simple-html')
      expect(result.confidence).toBe(50)
    })

    it('returns simple-html with confidence 50 for undefined', () => {
      // @ts-expect-error testing runtime guard
      const result = detectComplexity(undefined)
      expect(result.mode).toBe('simple-html')
      expect(result.confidence).toBe(50)
    })
  })

  // ── Explicit single-file requests ────────────────────────────────────────────
  describe('explicit single-file indicators', () => {
    const singleFilePhrases = [
      'on one html file',
      'in one file',
      'single file',
      'all in one',
      'not as separate files',
      "don't split into files",
      'single page application',
      'spa',
    ]

    it.each(singleFilePhrases)(
      'returns simple-html with confidence 95 when prompt contains "%s"',
      (phrase) => {
        const result = detectComplexity(`Create a website ${phrase}`)
        expect(result.mode).toBe('simple-html')
        expect(result.confidence).toBe(95)
        expect(result.detectedFeatures).toContain('explicit-single-file-request')
      }
    )
  })

  // ── Simple HTML prompts ─────────────────────────────────────────────────────
  describe('simple HTML prompts', () => {
    it('classifies a pure landing page as simple-html', () => {
      const result = detectComplexity('Create a landing page for my startup')
      expect(result.mode).toBe('simple-html')
    })

    it('classifies a portfolio website as simple-html', () => {
      const result = detectComplexity('A portfolio website with my work and bio')
      expect(result.mode).toBe('simple-html')
    })

    it('classifies a coming-soon page as simple-html', () => {
      const result = detectComplexity('Simple coming soon page')
      expect(result.mode).toBe('simple-html')
    })

    it('classifies a static blog post page as simple-html', () => {
      const result = detectComplexity('A blog post page with typography')
      expect(result.mode).toBe('simple-html')
    })
  })

  // ── Full-stack prompts ───────────────────────────────────────────────────────
  describe('full-stack prompts', () => {
    it('classifies login + database as fullstack-nextjs', () => {
      const result = detectComplexity(
        'Build a login system with a database to store users'
      )
      expect(result.mode).toBe('fullstack-nextjs')
    })

    it('classifies Stripe payment checkout as fullstack-nextjs', () => {
      const result = detectComplexity(
        'Online store with stripe payment and checkout'
      )
      expect(result.mode).toBe('fullstack-nextjs')
    })

    it('classifies e-commerce with auth as fullstack-nextjs', () => {
      const result = detectComplexity(
        'E-commerce website with login and user accounts'
      )
      expect(result.mode).toBe('fullstack-nextjs')
    })

    it('classifies a real-time chat application as fullstack-nextjs', () => {
      const result = detectComplexity(
        'Build a real-time chat app with websocket'
      )
      expect(result.mode).toBe('fullstack-nextjs')
    })

    it('classifies admin dashboard with authentication as fullstack-nextjs', () => {
      const result = detectComplexity(
        'Admin panel with authentication and user management'
      )
      expect(result.mode).toBe('fullstack-nextjs')
    })

    it('classifies file upload with cloud storage as fullstack-nextjs', () => {
      const result = detectComplexity(
        'App with file upload to S3 and database backend'
      )
      expect(result.mode).toBe('fullstack-nextjs')
    })
  })

  // ── e-commerce should NOT be downgraded by "website" keyword ─────────────────
  describe('simple keywords do not penalise fullstack prompts', () => {
    it('e-commerce website is still fullstack-nextjs', () => {
      const result = detectComplexity('Build an e-commerce website with login')
      expect(result.mode).toBe('fullstack-nextjs')
    })

    it('online store portfolio website prefers fullstack signals', () => {
      const result = detectComplexity('SaaS dashboard website with database and authentication')
      expect(result.mode).toBe('fullstack-nextjs')
    })
  })

  // ── Return shape ─────────────────────────────────────────────────────────────
  describe('return value shape', () => {
    it('includes detectedFeatures for fullstack signals', () => {
      const result = detectComplexity('Build a login system with a database')
      expect(result.detectedFeatures.length).toBeGreaterThan(0)
      expect(result.detectedFeatures.some(f => f.startsWith('auth:') || f.startsWith('database:'))).toBe(true)
    })

    it('includes a reasoning string', () => {
      const result = detectComplexity('landing page')
      expect(typeof result.reasoning).toBe('string')
      expect(result.reasoning.length).toBeGreaterThan(0)
    })

    it('confidence is between 50 and 95 for normal prompts', () => {
      const inputs = [
        'landing page',
        'database and authentication system',
        'portfolio website',
      ]
      for (const input of inputs) {
        const { confidence } = detectComplexity(input)
        expect(confidence).toBeGreaterThanOrEqual(50)
        expect(confidence).toBeLessThanOrEqual(95)
      }
    })
  })
})
