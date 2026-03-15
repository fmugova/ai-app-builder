import {
  validatePassword,
  validateEmail,
  sanitizeInput,
  sanitizeHTML,
  validateUsername,
} from './user-input-validator'

describe('validatePassword', () => {
  // ── Valid passwords ───────────────────────────────────────────────────────────
  describe('valid passwords', () => {
    it('accepts a strong password', () => {
      const result = validatePassword('Correct-Horse-Battery99!')
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('marks strong password with strength "strong"', () => {
      const result = validatePassword('Str0ng!Password#2024')
      expect(result.strength).toBe('strong')
    })

    it('marks medium-strength password correctly', () => {
      const result = validatePassword('Medium123abc')
      expect(result.strength).toBe('medium')
    })
  })

  // ── Length constraints ────────────────────────────────────────────────────────
  describe('length constraints', () => {
    it('rejects password shorter than 8 characters', () => {
      const result = validatePassword('Ab1!')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters long')
    })

    it('rejects password longer than 128 characters', () => {
      const long = 'Aa1!' + 'x'.repeat(130)
      const result = validatePassword(long)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must be less than 128 characters')
    })

    it('accepts exactly 8 characters with required complexity', () => {
      const result = validatePassword('Abcde1!x')
      // 8 chars with uppercase, lowercase, number — may or may not have special
      expect(result.errors.every(e => !e.includes('8 characters'))).toBe(true)
    })
  })

  // ── Complexity requirements ───────────────────────────────────────────────────
  describe('complexity requirements', () => {
    it('requires a lowercase letter', () => {
      const result = validatePassword('ALLUPPERCASE1!')
      expect(result.errors).toContain(
        'Password must contain at least one lowercase letter'
      )
    })

    it('requires an uppercase letter', () => {
      const result = validatePassword('alllowercase1!')
      expect(result.errors).toContain(
        'Password must contain at least one uppercase letter'
      )
    })

    it('requires a number', () => {
      const result = validatePassword('NoNumberHere!')
      expect(result.errors).toContain(
        'Password must contain at least one number'
      )
    })

    it('weak short password has strength "weak"', () => {
      const result = validatePassword('weak')
      expect(result.strength).toBe('weak')
    })
  })
})

describe('validateEmail', () => {
  describe('valid emails', () => {
    it('accepts a standard email address', () => {
      expect(validateEmail('user@example.com').valid).toBe(true)
    })

    it('accepts email with subdomain', () => {
      expect(validateEmail('user@mail.example.co.uk').valid).toBe(true)
    })

    it('accepts email with plus sign', () => {
      expect(validateEmail('user+tag@example.com').valid).toBe(true)
    })
  })

  describe('invalid emails', () => {
    it('rejects empty string', () => {
      const result = validateEmail('')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Email is required')
    })

    it('rejects email without @', () => {
      const result = validateEmail('notanemail')
      expect(result.valid).toBe(false)
    })

    it('rejects email without domain', () => {
      expect(validateEmail('user@').valid).toBe(false)
    })

    it('rejects email exceeding 254 characters', () => {
      const longEmail = 'a'.repeat(244) + '@example.com' // > 254 chars
      const result = validateEmail(longEmail)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Email is too long')
    })

    it('rejects email with spaces', () => {
      expect(validateEmail('user @example.com').valid).toBe(false)
    })
  })
})

describe('sanitizeInput', () => {
  it('escapes < and > characters', () => {
    const result = sanitizeInput('<script>alert(1)</script>')
    expect(result).not.toContain('<')
    expect(result).not.toContain('>')
    expect(result).toContain('&lt;')
    expect(result).toContain('&gt;')
  })

  it('escapes double quotes', () => {
    const result = sanitizeInput('"hello"')
    expect(result).not.toContain('"')
    expect(result).toContain('&quot;')
  })

  it('escapes single quotes', () => {
    const result = sanitizeInput("it's a test")
    expect(result).not.toContain("'")
    expect(result).toContain('&#x27;')
  })

  it('escapes forward slashes', () => {
    const result = sanitizeInput('path/to/resource')
    expect(result).not.toContain('/')
    expect(result).toContain('&#x2F;')
  })

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello')
  })

  it('passes through plain text unchanged (except trim)', () => {
    expect(sanitizeInput('Hello World')).toBe('Hello World')
  })
})

describe('sanitizeHTML', () => {
  it('removes <script> tags and their content', () => {
    const result = sanitizeHTML('<p>Hello</p><script>alert("xss")</script>')
    expect(result).not.toContain('<script>')
    expect(result).not.toContain('</script>')
    expect(result).not.toContain('alert')
    expect(result).toContain('<p>Hello</p>')
  })

  it('removes inline event handlers (onclick, onerror, etc.)', () => {
    const result = sanitizeHTML('<img src="x" onerror="alert(1)">')
    expect(result).not.toMatch(/on\w+\s*=/i)
  })

  it('removes javascript: URI scheme', () => {
    const result = sanitizeHTML('<a href="javascript:void(0)">Click</a>')
    expect(result).not.toContain('javascript:')
  })

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeHTML('  <p>test</p>  ')).toBe('<p>test</p>')
  })

  it('preserves safe HTML', () => {
    const html = '<h1>Title</h1><p>Content</p>'
    expect(sanitizeHTML(html)).toBe(html)
  })
})

describe('validateUsername', () => {
  describe('valid usernames', () => {
    it('accepts alphanumeric username', () => {
      expect(validateUsername('john123').valid).toBe(true)
    })

    it('accepts username with underscores and hyphens', () => {
      expect(validateUsername('john_doe-dev').valid).toBe(true)
    })

    it('accepts username with exactly 3 characters', () => {
      expect(validateUsername('abc').valid).toBe(true)
    })

    it('accepts username with exactly 30 characters', () => {
      expect(validateUsername('a'.repeat(30)).valid).toBe(true)
    })
  })

  describe('invalid usernames', () => {
    it('rejects empty string', () => {
      const result = validateUsername('')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Username is required')
    })

    it('rejects username shorter than 3 characters', () => {
      const result = validateUsername('ab')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Username must be at least 3 characters')
    })

    it('rejects username longer than 30 characters', () => {
      const result = validateUsername('a'.repeat(31))
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Username must be less than 30 characters')
    })

    it('rejects username with spaces', () => {
      const result = validateUsername('john doe')
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/only contain/i)
    })

    it('rejects username with special characters', () => {
      const result = validateUsername('john@doe!')
      expect(result.valid).toBe(false)
    })
  })
})
