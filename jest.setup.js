// Jest setup - no additional configuration needed

// Set env vars needed by modules that read process.env at module-load time.
// Real values are never required here — these are test-only defaults.
process.env.NEXTAUTH_SECRET =
  process.env.NEXTAUTH_SECRET || 'test-nextauth-secret-for-jest-only'
process.env.ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || 'test-encryption-key-for-jest-only'