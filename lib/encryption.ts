import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32chars'
const IV_LENGTH = 16

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
    iv
  )
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decrypt(text: string): string {
  try {
    const textParts = text.split(':')
    const iv = Buffer.from(textParts.shift()!, 'hex')
    const encryptedText = Buffer.from(textParts.join(':'), 'hex')
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
      iv
    )
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt token')
  }
}
