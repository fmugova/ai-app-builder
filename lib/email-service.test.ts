// lib/email-service.test.ts
import { sendEmail, emailTemplates, isValidEmail, sendBulkEmails } from './email-service'

// Mock global fetch
global.fetch = jest.fn()

describe('email-service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear environment variables
    delete process.env.RESEND_API_KEY
    delete process.env.SENDGRID_API_KEY
    delete process.env.EMAIL_FROM
  })

  describe('sendEmail', () => {
    it('should use console provider when no API keys configured', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
        text: 'Test content'
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toMatch(/^dev-/)
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('EMAIL (DEVELOPMENT MODE)'))

      consoleSpy.mockRestore()
    })

    it('should use Resend when RESEND_API_KEY is set', async () => {
      process.env.RESEND_API_KEY = 're_test_key'
      process.env.EMAIL_FROM = 'test@example.com'

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'resend-message-123' })
      })

      const result = await sendEmail({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('resend-message-123')
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer re_test_key'
          })
        })
      )
    })

    it('should use SendGrid when SENDGRID_API_KEY is set', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test_key'
      process.env.EMAIL_FROM = 'test@example.com'

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: {
          get: () => 'sendgrid-msg-123'
        },
        json: async () => ({})
      })

      const result = await sendEmail({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      })

      expect(result.success).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.sendgrid.com/v3/mail/send',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer SG.test_key'
          })
        })
      )
    })

    it('should handle API errors gracefully', async () => {
      process.env.RESEND_API_KEY = 're_test_key'

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Invalid email address' })
      })

      const result = await sendEmail({
        to: 'invalid-email',
        subject: 'Test',
        html: '<p>Test</p>'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Resend API error')
    })

    it('should support multiple recipients', async () => {
      process.env.RESEND_API_KEY = 're_test_key'

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg-123' })
      })

      await sendEmail({
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Test',
        html: '<p>Test</p>'
      })

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
      expect(callBody.to).toEqual(['user1@example.com', 'user2@example.com'])
    })

    it('should support CC and BCC', async () => {
      process.env.RESEND_API_KEY = 're_test_key'

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg-123' })
      })

      await sendEmail({
        to: 'primary@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com']
      })

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
      expect(callBody.cc).toEqual(['cc@example.com'])
      expect(callBody.bcc).toEqual(['bcc@example.com'])
    })

    it('should support reply-to address', async () => {
      process.env.RESEND_API_KEY = 're_test_key'

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg-123' })
      })

      await sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        replyTo: 'support@example.com'
      })

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
      expect(callBody.reply_to).toBe('support@example.com')
    })
  })

  describe('emailTemplates', () => {
    it('should generate contact form notification template', () => {
      const template = emailTemplates.contactFormNotification({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello, I have a question.'
      })

      expect(template.subject).toContain('Contact Form')
      expect(template.html).toContain('John Doe')
      expect(template.html).toContain('john@example.com')
      expect(template.html).toContain('Hello, I have a question.')
      expect(template.text).toContain('John Doe')
    })

    it('should generate newsletter welcome template', () => {
      const template = emailTemplates.newsletterWelcome({ name: 'Jane' })

      expect(template.subject).toContain('Welcome')
      expect(template.html).toContain('Jane')
      expect(template.html).toContain('newsletter')
      expect(template.text).toContain('newsletter')
    })

    it('should handle missing name in newsletter welcome', () => {
      const template = emailTemplates.newsletterWelcome({})

      expect(template.html).toContain('Welcome')
      expect(template.html).not.toContain('undefined')
    })

    it('should generate email verification template', () => {
      const template = emailTemplates.verifyEmail({
        verificationUrl: 'https://example.com/verify?token=abc123',
        name: 'User'
      })

      expect(template.subject).toContain('Verify')
      expect(template.html).toContain('https://example.com/verify?token=abc123')
      expect(template.html).toContain('User')
      expect(template.text).toContain('https://example.com/verify?token=abc123')
    })

    it('should generate password reset template', () => {
      const template = emailTemplates.passwordReset({
        resetUrl: 'https://example.com/reset?token=xyz789',
        name: 'Alice'
      })

      expect(template.subject).toContain('Reset')
      expect(template.html).toContain('https://example.com/reset?token=xyz789')
      expect(template.html).toContain('Alice')
      expect(template.html).toContain('1 hour')
    })

    it('should generate admin notification template', () => {
      const template = emailTemplates.adminNotification({
        title: 'New User Signup',
        message: 'User john@example.com signed up',
        actionUrl: 'https://example.com/admin/users/123'
      })

      expect(template.subject).toContain('Admin Notice')
      expect(template.subject).toContain('New User Signup')
      expect(template.html).toContain('john@example.com')
      expect(template.html).toContain('https://example.com/admin/users/123')
    })

    it('should escape HTML in templates', () => {
      const template = emailTemplates.contactFormNotification({
        name: '<script>alert("xss")</script>',
        email: 'test@example.com',
        message: '<img src=x onerror=alert(1)>'
      })

      // Check that dangerous HTML is escaped
      expect(template.html).not.toContain('<script>')
      expect(template.html).toContain('&lt;script&gt;')
      expect(template.html).not.toContain('<img')
      expect(template.html).toContain('&lt;img')
    })
  })

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name+tag@example.co.uk')).toBe(true)
      expect(isValidEmail('test123@subdomain.example.com')).toBe(true)
    })

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('not-an-email')).toBe(false)
      expect(isValidEmail('missing@domain')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('user@')).toBe(false)
      expect(isValidEmail('')).toBe(false)
      expect(isValidEmail('spaces in@email.com')).toBe(false)
    })
  })

  describe('sendBulkEmails', () => {
    beforeEach(() => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    })

    afterEach(() => {
      (console.log as jest.Mock).mockRestore()
    })

    it('should send multiple emails', async () => {
      const emails = [
        { to: 'user1@example.com', subject: 'Test 1', html: '<p>Test 1</p>' },
        { to: 'user2@example.com', subject: 'Test 2', html: '<p>Test 2</p>' },
        { to: 'user3@example.com', subject: 'Test 3', html: '<p>Test 3</p>' }
      ]

      const results = await sendBulkEmails(emails)

      expect(results).toHaveLength(3)
      expect(results.every(r => r.success)).toBe(true)
    })

    it('should handle batch size', async () => {
      const emails = Array.from({ length: 25 }, (_, i) => ({
        to: `user${i}@example.com`,
        subject: `Test ${i}`,
        html: `<p>Test ${i}</p>`
      }))

      const results = await sendBulkEmails(emails, { batchSize: 10, delayMs: 0 })

      expect(results).toHaveLength(25)
    })

    it('should handle failures in bulk sends', async () => {
      process.env.RESEND_API_KEY = 're_test_key'

      let callCount = 0
      ;(global.fetch as jest.Mock).mockImplementation(() => {
        callCount++
        return Promise.resolve({
          ok: callCount !== 2, // Fail second call
          json: async () => callCount === 2 
            ? { message: 'Error' }
            : { id: `msg-${callCount}` }
        })
      })

      const emails = [
        { to: 'user1@example.com', subject: 'Test 1', html: '<p>1</p>' },
        { to: 'user2@example.com', subject: 'Test 2', html: '<p>2</p>' },
        { to: 'user3@example.com', subject: 'Test 3', html: '<p>3</p>' }
      ]

      const results = await sendBulkEmails(emails)

      expect(results).toHaveLength(3)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[2].success).toBe(true)
    })
  })

  describe('Provider Selection', () => {
    it('should prefer Resend over SendGrid', async () => {
      process.env.RESEND_API_KEY = 're_test_key'
      process.env.SENDGRID_API_KEY = 'SG.test_key'

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'resend-msg' })
      })

      await sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.any(Object)
      )
    })

    it('should use default EMAIL_FROM when not specified', async () => {
      process.env.RESEND_API_KEY = 're_test_key'
      process.env.EMAIL_FROM = 'default@example.com'

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg' })
      })

      await sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      })

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
      expect(callBody.from).toBe('default@example.com')
    })

    it('should allow overriding from address', async () => {
      process.env.RESEND_API_KEY = 're_test_key'
      process.env.EMAIL_FROM = 'default@example.com'

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg' })
      })

      await sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        from: 'custom@example.com'
      })

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
      expect(callBody.from).toBe('custom@example.com')
    })
  })
})
