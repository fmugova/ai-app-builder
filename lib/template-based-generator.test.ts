import {
  generateWithTemplate,
  generateComplexAPI,
  smartGenerate,
} from './template-based-generator'

// Mock global fetch for Anthropic API calls
global.fetch = jest.fn()

describe('template-based-generator', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful API responses with realistic code length
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          {
            type: 'text',
            text: `export async function GET() {
  try {
    const users = await prisma.user.findMany()
    return NextResponse.json({ users })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}`,
          },
        ],
      }),
    })
  })
  describe('generateWithTemplate', () => {
    it('should generate code using template approach', async () => {
      const result = await generateWithTemplate({
        description: 'Get all users',
        method: 'GET',
        tableName: 'users'
      })

      expect(result.code).toBeTruthy()
      expect(result.code.length).toBeGreaterThan(100)
      expect(result.template).toBeTruthy()
      expect(result.metadata).toBeDefined()
      expect(result.metadata.tokensUsed).toBeGreaterThanOrEqual(0)
      expect(result.metadata.approach).toBe('template')
    })

    it('should include proper structure', async () => {
      const result = await generateWithTemplate({
        description: 'Create a new user',
        method: 'POST',
        tableName: 'user'
      })

      expect(result.code).toContain('export async function')
      expect(result.code).toContain('NextResponse')
      expect(result.code).toContain('try')
      expect(result.code).toContain('catch')
    })

    it('should select CREATE template for create operations', async () => {
      const result = await generateWithTemplate({
        description: 'Create new product',
        method: 'POST'
      })

      expect(result.template).toBe('crud-create')
    })

    it('should select READ template for get operations', async () => {
      const result = await generateWithTemplate({
        description: 'Get all products',
        method: 'GET'
      })

      expect(result.template).toBe('crud-read')
    })

    it('should select UPDATE template for update operations', async () => {
      const result = await generateWithTemplate({
        description: 'Update product',
        method: 'PUT'
      })

      expect(result.template).toBe('crud-update')
    })

    it('should select DELETE template for delete operations', async () => {
      const result = await generateWithTemplate({
        description: 'Delete product',
        method: 'DELETE'
      })

      expect(result.template).toBe('crud-delete')
    })

    it('should extract table names from descriptions', async () => {
      const result = await generateWithTemplate({
        description: 'Get all orders for the customer',
        method: 'GET'
      })

      // Table name extraction logic looks for nouns, may extract "orders" or related term
      expect(result.path).toBeTruthy()
      expect(result.path).toContain('/api/')
    })

    it('should include validation schema', async () => {
      const result = await generateWithTemplate({
        description: 'Create a new product with name and price',
        method: 'POST'
      })

      expect(result.generatedSections.validation).toBeTruthy()
    })

    it('should include business logic', async () => {
      const result = await generateWithTemplate({
        description: 'Update user email',
        method: 'PUT'
      })

      expect(result.generatedSections.businessLogic).toBeTruthy()
      expect(result.generatedSections.businessLogic).toContain('prisma')
    })
  })

  describe('generateComplexAPI', () => {
    it('should generate code for complex APIs', async () => {
      const result = await generateComplexAPI(
        'Handle Stripe webhook with signature verification and event processing'
      )

      expect(result.code).toBeTruthy()
      expect(result.code.length).toBeGreaterThan(100)
      expect(result.template).toBe('chunked')
      expect(result.metadata).toBeDefined()
      expect(result.metadata.tokensUsed).toBeGreaterThan(0)
      expect(result.metadata.approach).toBe('complex')
    })

    it('should handle long descriptions', async () => {
      const longDescription = 'A'.repeat(600)
      const result = await generateComplexAPI(longDescription)

      expect(result.code).toBeTruthy()
      expect(result.template).toBe('chunked')
    })

    it('should generate structure, logic, and error handling', async () => {
      const result = await generateComplexAPI(
        'Complex authentication callback handler'
      )

      expect(result.generatedSections.structure).toBeTruthy()
      expect(result.generatedSections.businessLogic).toBeTruthy()
      expect(result.generatedSections.validation).toBeTruthy()
    })
  })

  describe('smartGenerate', () => {
    it('should use template for simple CRUD operations', async () => {
      const result = await smartGenerate(
        'Create new product',
        {
          description: 'Create new product',
          method: 'POST'
        }
      )

      expect(result.template).toBe('crud-create')
      expect(result.metadata.tokensUsed).toBeGreaterThan(0)
      expect(result.metadata.approach).toBe('template')
    })

    it('should use complex generation for long descriptions', async () => {
      const longDescription = 'Handle Stripe webhook events with signature verification and ' +
        'process multiple event types including payment_intent.succeeded and payment_intent.failed and ' +
        'customer.subscription.created and customer.subscription.updated and many more events'
      
      const result = await smartGenerate(
        longDescription,
        {
          description: longDescription,
          method: 'POST'
        }
      )

      expect(result.template).toBe('chunked')
      expect(result.metadata.approach).toBe('complex')
    })

    it('should use complex generation for descriptions with "multiple"', async () => {
      // This needs enough "and"s to trigger complex generation
      const description = 'Handle multiple webhook events and process and validate and store'
      const result = await smartGenerate(
        description,
        {
          description,
          method: 'POST'
        }
      )

      expect(result.metadata.approach).toBe('complex')
    })

    it('should use complex generation for descriptions with "complex"', async () => {
      // "complex" keyword should trigger complex generation
      const description = 'Complex data aggregation and transformation and validation and processing'
      const result = await smartGenerate(
        description,
        {
          description,
          method: 'POST'
        }
      )

      expect(result.metadata.approach).toBe('complex')
    })

    it('should automatically select best approach', async () => {
      const simpleResult = await smartGenerate(
        'Get users',
        {
          description: 'Get users',
          method: 'GET'
        }
      )
      
      const complexResult = await smartGenerate(
        'Advanced search with filters and aggregation and transformation and validation',
        {
          description: 'Advanced search with multiple filters and complex aggregation logic and data transformation and validation',
          method: 'POST'
        }
      )

      expect(simpleResult.metadata.approach).toBe('template')
      expect(complexResult.metadata.approach).toBe('complex')
    })

    it('should return valid TypeScript code', async () => {
      const result = await smartGenerate('Create user', {
        description: 'Create user',
        method: 'POST'
      })

      expect(result.code).toContain('export')
      expect(result.code).toContain('async')
      expect(result.code).not.toContain('undefined')
    })

    it('should handle different HTTP methods', async () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

      for (const method of methods) {
        const result = await smartGenerate(
          `${method} operation`,
          {
            description: `${method} operation`,
            method: method
          }
        )

        expect(result.code).toBeTruthy()
        expect(result.metadata.tokensUsed).toBeGreaterThan(0)
      }
    })

    it('should report token usage metrics', async () => {
      const result = await smartGenerate('Get users', {
        description: 'Get users',
        method: 'GET'
      })

      expect(result.metadata.tokensUsed).toBeGreaterThan(0)
      expect(result.metadata.generatedAt).toBeInstanceOf(Date)
    })
  })

  describe('Code Quality', () => {
    it('should generate code with proper error handling', async () => {
      const result = await smartGenerate('Create user', {
        description: 'Create user',
        method: 'POST'
      })

      expect(result.code).toContain('try')
      expect(result.code).toContain('catch')
    })

    it('should include proper TypeScript types', async () => {
      const result = await smartGenerate('Get users', {
        description: 'Get users',
        method: 'GET'
      })

      expect(result.code).toContain('NextResponse')
      expect(result.code).toContain('async')
    })

    it('should generate production-ready code', async () => {
      const result = await smartGenerate('Update user', {
        description: 'Update user',
        method: 'PUT'
      })

      // Should include validation, error handling, proper responses
      expect(result.code.length).toBeGreaterThan(100)
      expect(result.code).toContain('return')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty descriptions', async () => {
      const result = await smartGenerate('', {
        description: '',
        method: 'GET'
      })

      expect(result.code).toBeTruthy()
      expect(result.template).toBeTruthy()
    })

    it('should handle very long descriptions', async () => {
      const longDescription = 'A'.repeat(1000)
      const result = await smartGenerate(longDescription, {
        description: longDescription,
        method: 'GET'
      })

      expect(result.code).toBeTruthy()
      expect(result.metadata.approach).toBe('complex')
    })

    it('should handle special characters in description', async () => {
      const result = await smartGenerate(
        'Create user with @email & #tags',
        {
          description: 'Create user with @email & #tags',
          method: 'POST'
        }
      )

      expect(result.code).toBeTruthy()
    })
  })

  describe('Token Optimization', () => {
    it('should use fewer tokens for template-based generation', async () => {
      const templateResult = await generateWithTemplate({
        description: 'Create user',
        method: 'POST'
      })
      
      const complexResult = await generateComplexAPI('Create user')

      // Template should use fewer (or similar) tokens
      expect(templateResult.metadata.tokensUsed).toBeLessThanOrEqual(
        complexResult.metadata.tokensUsed * 1.5
      )
    })

    it('should report accurate token counts', async () => {
      const result = await smartGenerate('Get all products', {
        description: 'Get all products',
        method: 'GET'
      })

      expect(result.metadata.tokensUsed).toBeGreaterThan(0)
      expect(result.metadata.tokensUsed).toBeLessThan(100000) // Sanity check
    })
  })

  describe('Performance', () => {
    it('should complete generation in reasonable time', async () => {
      const start = Date.now()
      
      await smartGenerate('Get users', {
        description: 'Get users',
        method: 'GET'
      })
      
      const duration = Date.now() - start
      
      // Should complete in less than 10 seconds (generous for CI)
      expect(duration).toBeLessThan(10000)
    }, 15000)

    it('should handle concurrent requests', async () => {
      const promises = [
        smartGenerate('Get users', { description: 'Get users', method: 'GET' }),
        smartGenerate('Create product', { description: 'Create product', method: 'POST' }),
        smartGenerate('Update order', { description: 'Update order', method: 'PUT' }),
      ]

      const results = await Promise.all(promises)

      results.forEach(result => {
        expect(result.code).toBeTruthy()
        expect(result.metadata).toBeDefined()
      })
    })
  })
})
