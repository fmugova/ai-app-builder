// lib/encryption.ts
// Secure encryption/decryption for environment variables and sensitive data

import crypto from 'crypto'

// Ensure key is 32 bytes via SHA-256 derivation — validated at runtime, not module load
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key && process.env.NODE_ENV === 'production') {
    throw new Error('ENCRYPTION_KEY environment variable is required in production')
  }
  return crypto.createHash('sha256').update(key || 'dev-only-fallback-not-for-production-use').digest()
}

/**
 * Encrypt a string value
 * Uses AES-256-GCM for authenticated encryption
 */
export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(16)
    const key = getEncryptionKey()
    
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    // Return: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt value')
  }
}

/**
 * Decrypt an encrypted string value
 */
export function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':')
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format')
    }
    
    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]
    
    const key = getEncryptionKey()
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt value')
  }
}

/**
 * Mask a value for display (show only first/last 4 chars)
 */
export function maskValue(value: string): string {
  if (value.length <= 8) {
    return '•'.repeat(value.length)
  }
  
  return `${value.substring(0, 4)}${'•'.repeat(value.length - 8)}${value.substring(value.length - 4)}`
}

/**
 * Validate environment variable key format
 */
export function isValidEnvKey(key: string): boolean {
  // Must start with letter, contain only uppercase letters, numbers, and underscores
  const keyRegex = /^[A-Z][A-Z0-9_]*$/
  return keyRegex.test(key)
}

/**
 * Generate .env file content from environment variables
 */
export function generateEnvFile(variables: Array<{ key: string; value: string; description?: string }>): string {
  let content = '# Environment Variables\n'
  content += `# Generated on ${new Date().toLocaleString()}\n\n`
  
  for (const variable of variables) {
    if (variable.description) {
      content += `# ${variable.description}\n`
    }
    content += `${variable.key}=${variable.value}\n\n`
  }
  
  return content
}

/**
 * Generate .env.example file (with masked values)
 */
export function generateEnvExample(variables: Array<{ key: string; description?: string }>): string {
  let content = '# Environment Variables Example\n'
  content += '# Copy this file to .env and fill in your actual values\n\n'
  
  for (const variable of variables) {
    if (variable.description) {
      content += `# ${variable.description}\n`
    }
    content += `${variable.key}=your_${variable.key.toLowerCase()}_here\n\n`
  }
  
  return content
}

/**
 * Parse .env file content
 */
export function parseEnvFile(content: string): Array<{ key: string; value: string }> {
  const variables: Array<{ key: string; value: string }> = []
  
  const lines = content.split('\n')
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    // Skip comments and empty lines
    if (trimmed.startsWith('#') || trimmed === '') {
      continue
    }
    
    // Parse KEY=value
    const match = trimmed.match(/^([A-Z][A-Z0-9_]*)=(.*)$/)
    
    if (match) {
      const [, key, value] = match
      variables.push({
        key: key.trim(),
        value: value.trim().replace(/^["']|["']$/g, '') // Remove quotes if present
      })
    }
  }
  
  return variables
}

/**
 * Validate environment value (basic checks)
 */
export function validateEnvValue(value: string, key: string): { valid: boolean; error?: string } {
  // Check for common sensitive patterns that shouldn't be exposed
  if (value.trim() === '') {
    return { valid: false, error: 'Value cannot be empty' }
  }
  
  // Check for placeholder values
  const placeholders = ['your_', 'example', 'changeme', 'placeholder', 'xxx']
  const lowerValue = value.toLowerCase()
  
  if (placeholders.some(p => lowerValue.includes(p))) {
    return {
      valid: false,
      error: 'Value appears to be a placeholder. Please use your actual value.'
    }
  }
  
  // Warn about potentially exposed secrets
  if (key.includes('SECRET') || key.includes('KEY') || key.includes('PASSWORD')) {
    if (value.length < 16) {
      return {
        valid: false,
        error: 'Secret/key values should be at least 16 characters long'
      }
    }
  }
  
  return { valid: true }
}
