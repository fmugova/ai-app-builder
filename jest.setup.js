// Jest setup - no additional configuration needed
const crypto = require('crypto')

// Set env vars needed by modules that read process.env at module-load time.
// These are randomly generated at test-run time; no real secrets are ever
// committed to the repository.
process.env.NEXTAUTH_SECRET =
  process.env.NEXTAUTH_SECRET || crypto.randomBytes(32).toString('hex')
process.env.ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')