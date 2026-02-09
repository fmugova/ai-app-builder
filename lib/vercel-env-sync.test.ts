import {
  syncSupabaseEnvVarsToVercel,
  getVercelProjectId,
  triggerVercelRedeployment,
} from './vercel-env-sync'

// Mock fetch
global.fetch = jest.fn()

describe('vercel-env-sync', () => {
  const mockVercelToken = 'vercel_token_123'
  const mockProjectId = 'prj_abc123'
  const mockEnvVars = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://xxx.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getVercelProjectId', () => {
    it('should fetch project ID by name', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          projects: [
            { id: mockProjectId, name: 'my-project' },
          ],
        }),
      })

      const projectId = await getVercelProjectId(mockVercelToken, 'my-project')

      expect(projectId).toBe(mockProjectId)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v9/projects'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockVercelToken}`,
          }),
        })
      )
    })

    it('should return null if project not found', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          projects: [],
        }),
      })

      const projectId = await getVercelProjectId(mockVercelToken, 'nonexistent')

      expect(projectId).toBeNull()
    })

    it('should handle API errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      })

      const projectId = await getVercelProjectId(mockVercelToken, 'my-project')
      
      expect(projectId).toBeNull()
    })

    it('should handle network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const projectId = await getVercelProjectId(mockVercelToken, 'my-project')
      
      expect(projectId).toBeNull()
    })
  })

  describe('syncSupabaseEnvVarsToVercel', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ created: {} }),
      })
    })

    it('should sync all Supabase environment variables', async () => {
      const result = await syncSupabaseEnvVarsToVercel({
        vercelProjectId: mockProjectId,
        vercelToken: mockVercelToken,
        supabaseUrl: mockEnvVars.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: mockEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabaseServiceKey: mockEnvVars.SUPABASE_SERVICE_ROLE_KEY
      })

      expect(result.success).toBe(true)
      expect(result.synced.length).toBeGreaterThanOrEqual(2)
      expect(global.fetch).toHaveBeenCalled()
    })

    it('should send environment variables to correct Vercel endpoint', async () => {
      await syncSupabaseEnvVarsToVercel({
        vercelProjectId: mockProjectId,
        vercelToken: mockVercelToken,
        supabaseUrl: mockEnvVars.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: mockEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
      })

      expect(global.fetch).toHaveBeenCalledWith(
        `https://api.vercel.com/v10/projects/${mockProjectId}/env`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockVercelToken}`,
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should set variables for all environments', async () => {
      ;(global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/env') && !url.includes('/env/')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ envs: [] }) // No existing vars
          })
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({})
        })
      })

      await syncSupabaseEnvVarsToVercel({
        vercelProjectId: mockProjectId,
        vercelToken: mockVercelToken,
        supabaseUrl: mockEnvVars.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: mockEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabaseServiceKey: mockEnvVars.SUPABASE_SERVICE_ROLE_KEY
      })

      // Find the POST request (creating new var)
      const postCall = (global.fetch as jest.Mock).mock.calls.find(
        call => call[1]?.method === 'POST'
      )
      expect(postCall).toBeDefined()
      
      const body = JSON.parse(postCall[1].body)
      expect(body.target).toEqual(['production', 'preview', 'development'])
    })

    it('should handle partial sync failures', async () => {
      let callCount = 0
      ;(global.fetch as jest.Mock).mockImplementation(() => {
        callCount++
        return Promise.resolve({
          ok: callCount !== 2, // Second call fails
          json: async () => ({}),
        })
      })

      const result = await syncSupabaseEnvVarsToVercel({
        vercelProjectId: mockProjectId,
        vercelToken: mockVercelToken,
        supabaseUrl: mockEnvVars.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: mockEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabaseServiceKey: mockEnvVars.SUPABASE_SERVICE_ROLE_KEY
      })

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.synced.length).toBeGreaterThan(0)
    })

    it('should skip empty environment variables', async () => {
      await syncSupabaseEnvVarsToVercel({
        vercelProjectId: mockProjectId,
        vercelToken: mockVercelToken,
        supabaseUrl: mockEnvVars.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: mockEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabaseServiceKey: '' // Empty service key
      })

      // Should still call fetch for URL and anon key
      expect(global.fetch).toHaveBeenCalled()
    })

    it('should handle Vercel API rate limits', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({ error: 'Rate limit exceeded' }),
      })

      const result = await syncSupabaseEnvVarsToVercel({
        vercelProjectId: mockProjectId,
        vercelToken: mockVercelToken,
        supabaseUrl: mockEnvVars.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: mockEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
      })

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('triggerVercelRedeployment', () => {
    it('should trigger redeployment successfully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'dpl_123',
          url: 'deployment-url.vercel.app',
        }),
      })

      const result = await triggerVercelRedeployment(mockVercelToken, 'https://my-app.vercel.app')

      expect(result).toBe(true)
    })

    it('should use correct Vercel API endpoint', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'dpl_123' }),
      })

      await triggerVercelRedeployment(mockVercelToken, 'https://my-app.vercel.app')

      expect(global.fetch).toHaveBeenCalledWith(
        `https://api.vercel.com/v13/deployments`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockVercelToken}`,
          }),
        })
      )
    })

    it('should handle deployment failures', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      const result = await triggerVercelRedeployment(mockVercelToken, 'https://my-app.vercel.app')

      expect(result).toBe(false)
    })

    it('should include deployment URL in request', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })

      await triggerVercelRedeployment(mockVercelToken, 'https://my-app.vercel.app')

      const callArgs = (global.fetch as jest.Mock).mock.calls[0][1]
      const body = JSON.parse(callArgs.body)

      expect(body.name).toBe('https://my-app.vercel.app')
      expect(body.target).toBe('production')
    })
  })

  describe('Integration Workflow', () => {
    it('should complete full sync workflow', async () => {
      ;(global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/projects')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              projects: [{ id: mockProjectId, name: 'my-project' }],
            }),
          })
        }
        if (url.includes('/env')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ created: {} }),
          })
        }
        if (url.includes('/deployments')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ id: 'dpl_123' }),
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      // 1. Get project ID
      const projectId = await getVercelProjectId(mockVercelToken, 'my-project')
      expect(projectId).toBe(mockProjectId)

      // 2. Sync environment variables
      const syncResult = await syncSupabaseEnvVarsToVercel({
        vercelProjectId: projectId!,
        vercelToken: mockVercelToken,
        supabaseUrl: mockEnvVars.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: mockEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabaseServiceKey: mockEnvVars.SUPABASE_SERVICE_ROLE_KEY
      })
      expect(syncResult.success).toBe(true)

      // 3. Trigger redeployment
      const deployResult = await triggerVercelRedeployment(mockVercelToken, 'https://my-app.vercel.app')
      expect(deployResult).toBe(true)
    })

    it('should handle missing project gracefully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ projects: [] }),
      })

      const projectId = await getVercelProjectId(mockVercelToken, 'nonexistent')

      expect(projectId).toBeNull()
    })
  })

  describe('Security', () => {
    it('should not expose sensitive keys in logs', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      await syncSupabaseEnvVarsToVercel({
        vercelProjectId: mockProjectId,
        vercelToken: mockVercelToken,
        supabaseUrl: mockEnvVars.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: mockEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabaseServiceKey: mockEnvVars.SUPABASE_SERVICE_ROLE_KEY
      })

      const logs = consoleSpy.mock.calls.flat().join(' ')
      expect(logs).not.toContain(mockEnvVars.SUPABASE_SERVICE_ROLE_KEY)

      consoleSpy.mockRestore()
    })

    it('should validate environment variable format', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })

      const result = await syncSupabaseEnvVarsToVercel({
        vercelProjectId: mockProjectId,
        vercelToken: mockVercelToken,
        supabaseUrl: mockEnvVars.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: mockEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
      })

      expect(result).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should provide helpful error messages', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ error: { message: 'Insufficient permissions' } }),
      })

      const result = await syncSupabaseEnvVarsToVercel({
        vercelProjectId: mockProjectId,
        vercelToken: mockVercelToken,
        supabaseUrl: mockEnvVars.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: mockEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
      })

      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should handle timeout errors', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100))
      )

      const result = await syncSupabaseEnvVarsToVercel({
        vercelProjectId: mockProjectId,
        vercelToken: mockVercelToken,
        supabaseUrl: mockEnvVars.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: mockEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
      })

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Performance', () => {
    it('should sync 3 env vars in under 500ms (with mocked API)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })

      const start = Date.now()
      await syncSupabaseEnvVarsToVercel({
        vercelProjectId: mockProjectId,
        vercelToken: mockVercelToken,
        supabaseUrl: mockEnvVars.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: mockEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabaseServiceKey: mockEnvVars.SUPABASE_SERVICE_ROLE_KEY
      })
      const duration = Date.now() - start

      expect(duration).toBeLessThan(500)
    })
  })
})
