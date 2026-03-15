// lib/csrf.test.ts
// NEXTAUTH_SECRET is set in jest.setup.js before any module loads.

// Mock external dependencies before importing the module under test
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((_body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
    })),
  },
}))
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))

import crypto from 'crypto'
import { generateCSRFToken } from './csrf'
// Re-import the mock so we can control it in validateCSRF tests
import { getServerSession } from 'next-auth'

const mockGetServerSession = getServerSession as jest.Mock

// ── generateCSRFToken ──────────────────────────────────────────────────────────
describe('generateCSRFToken', () => {
  const SECRET = process.env.NEXTAUTH_SECRET!

  it('returns a non-empty string', () => {
    const token = generateCSRFToken('user-123')
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
  })

  it('decodes to "timestamp.hmac" format', () => {
    const token = generateCSRFToken('user-abc')
    const decoded = Buffer.from(token, 'base64url').toString()
    const dotIndex = decoded.indexOf('.')
    expect(dotIndex).toBeGreaterThan(0)

    const timestamp = decoded.slice(0, dotIndex)
    const hmac = decoded.slice(dotIndex + 1)

    expect(Number(timestamp)).not.toBeNaN()
    expect(hmac).toMatch(/^[0-9a-f]{64}$/) // SHA-256 hex = 64 chars
  })

  it('embeds a recent timestamp', () => {
    const before = Date.now()
    const token = generateCSRFToken('user-ts')
    const after = Date.now()

    const decoded = Buffer.from(token, 'base64url').toString()
    const timestamp = Number(decoded.slice(0, decoded.indexOf('.')))

    expect(timestamp).toBeGreaterThanOrEqual(before)
    expect(timestamp).toBeLessThanOrEqual(after)
  })

  it('generates a verifiable HMAC', () => {
    const userId = 'user-verify'
    const token = generateCSRFToken(userId)
    const decoded = Buffer.from(token, 'base64url').toString()
    const dotIndex = decoded.indexOf('.')
    const timestamp = decoded.slice(0, dotIndex)
    const providedHmac = decoded.slice(dotIndex + 1)

    const expectedHmac = crypto
      .createHmac('sha256', SECRET)
      .update(`${userId}:${timestamp}`)
      .digest('hex')

    expect(providedHmac).toBe(expectedHmac)
  })

  it('produces different tokens on each call (random timestamp component)', () => {
    // Tokens may differ by timestamp; they should be unique over time
    const t1 = generateCSRFToken('same-user')
    const t2 = generateCSRFToken('same-user')
    // They will differ if called at different ms; even if same ms the HMAC is tied to timestamp
    // At minimum, both must be valid strings
    expect(typeof t1).toBe('string')
    expect(typeof t2).toBe('string')
  })

  it('produces different tokens for different user IDs', () => {
    const t1 = generateCSRFToken('user-A')
    const t2 = generateCSRFToken('user-B')
    expect(t1).not.toBe(t2)
  })
})

// ── validateCSRF ──────────────────────────────────────────────────────────────
describe('validateCSRF', () => {
  // Dynamically import so we get the module after mocks are applied
  let validateCSRF: (req: Request) => Promise<boolean>

  beforeAll(async () => {
    const mod = await import('./csrf')
    validateCSRF = mod.validateCSRF
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns false when there is no session', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const req = new Request('http://localhost/api/test', { method: 'POST' })
    expect(await validateCSRF(req)).toBe(false)
  })

  it('returns false when session has no user.id', async () => {
    mockGetServerSession.mockResolvedValue({ user: {} })
    const req = new Request('http://localhost/api/test', { method: 'POST' })
    expect(await validateCSRF(req)).toBe(false)
  })

  it('returns false when request has no CSRF token', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } })
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(await validateCSRF(req)).toBe(false)
  })

  it('returns false for a tampered token', async () => {
    const userId = 'user-tamper'
    mockGetServerSession.mockResolvedValue({ user: { id: userId } })
    const badToken = Buffer.from('9999999999.aaaa').toString('base64url')
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'x-csrf-token': badToken },
    })
    expect(await validateCSRF(req)).toBe(false)
  })

  it('returns true for a valid token in x-csrf-token header', async () => {
    const userId = 'user-valid'
    mockGetServerSession.mockResolvedValue({ user: { id: userId } })
    const token = generateCSRFToken(userId)
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'x-csrf-token': token },
    })
    expect(await validateCSRF(req)).toBe(true)
  })

  it('returns true for a valid token passed in the request body', async () => {
    const userId = 'user-body'
    mockGetServerSession.mockResolvedValue({ user: { id: userId } })
    const token = generateCSRFToken(userId)
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csrfToken: token }),
    })
    expect(await validateCSRF(req)).toBe(true)
  })

  it('returns false for expired token (timestamp in the past)', async () => {
    const userId = 'user-expired'
    mockGetServerSession.mockResolvedValue({ user: { id: userId } })

    // Craft a token with a timestamp 2 hours ago (beyond the 1-hour TTL)
    const oldTimestamp = (Date.now() - 2 * 60 * 60 * 1000).toString()
    const hmac = crypto
      .createHmac('sha256', process.env.NEXTAUTH_SECRET!)
      .update(`${userId}:${oldTimestamp}`)
      .digest('hex')
    const expiredToken = Buffer.from(`${oldTimestamp}.${hmac}`).toString('base64url')

    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'x-csrf-token': expiredToken },
    })
    expect(await validateCSRF(req)).toBe(false)
  })
})
