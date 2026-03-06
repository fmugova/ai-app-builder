/**
 * scripts/migrate-encrypt-db-credentials.ts
 *
 * One-time migration: encrypt existing plaintext credentials in the
 * DatabaseConnection table (password, supabaseAnonKey, supabaseServiceKey,
 * connectionString).
 *
 * Safe to re-run — already-encrypted values are detected and skipped.
 *
 * Usage:
 *   npx tsx scripts/migrate-encrypt-db-credentials.ts          # live run
 *   npx tsx scripts/migrate-encrypt-db-credentials.ts --dry-run # preview only
 */

import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { PrismaClient } from '@prisma/client'

// ── Load .env.local (takes priority over .env) ──────────────────────────────
const envLocalPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envLocalPath)) {
  const lines = fs.readFileSync(envLocalPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    process.env[key] = val
  }
}

const DRY_RUN = process.argv.includes('--dry-run')
const BATCH_SIZE = 100

// ── Encryption (mirrors lib/encryption.ts exactly) ──────────────────────────
function getKey(): Buffer {
  const k = process.env.ENCRYPTION_KEY
  if (!k) throw new Error('ENCRYPTION_KEY is not set')
  return crypto.createHash('sha256').update(k).digest()
}

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv)
  let enc = cipher.update(text, 'utf8', 'hex')
  enc += cipher.final('hex')
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc}`
}

/** Detect the iv:tag:ciphertext format produced by lib/encryption.ts */
const ENCRYPTED_RE = /^[0-9a-f]{32}:[0-9a-f]{32}:[0-9a-f]+$/

function isAlreadyEncrypted(value: string): boolean {
  return ENCRYPTED_RE.test(value)
}

function maybeEncrypt(value: string | null): { value: string | null; changed: boolean } {
  if (!value) return { value, changed: false }
  if (isAlreadyEncrypted(value)) return { value, changed: false }
  return { value: encrypt(value), changed: true }
}

// ── Main ─────────────────────────────────────────────────────────────────────
const prisma = new PrismaClient()

const CREDENTIAL_FIELDS = [
  'password',
  'supabaseAnonKey',
  'supabaseServiceKey',
  'connectionString',
] as const

type CredentialField = typeof CREDENTIAL_FIELDS[number]

async function main() {
  console.log(`\n${'─'.repeat(60)}`)
  console.log('  DatabaseConnection credential encryption migration')
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`)
  console.log(`${'─'.repeat(60)}\n`)

  // Count total rows
  const total = await prisma.databaseConnection.count()
  console.log(`Total connections: ${total}\n`)

  if (total === 0) {
    console.log('Nothing to migrate.')
    return
  }

  let cursor: string | undefined
  let rowsProcessed = 0
  let rowsUpdated = 0
  let rowsSkipped = 0
  let errors = 0

  while (true) {
    const batch = await prisma.databaseConnection.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        provider: true,
        password: true,
        supabaseAnonKey: true,
        supabaseServiceKey: true,
        connectionString: true,
      },
    })

    if (batch.length === 0) break
    cursor = batch[batch.length - 1].id

    for (const conn of batch) {
      rowsProcessed++

      const updates: Partial<Record<CredentialField, string | null>> = {}
      const changed: string[] = []

      for (const field of CREDENTIAL_FIELDS) {
        const { value, changed: didChange } = maybeEncrypt(conn[field])
        if (didChange) {
          updates[field] = value
          changed.push(field)
        }
      }

      if (changed.length === 0) {
        rowsSkipped++
        console.log(`  [skip]   ${conn.id} (${conn.name}) — all fields already encrypted or null`)
        continue
      }

      console.log(`  [update] ${conn.id} (${conn.name}) — encrypting: ${changed.join(', ')}`)

      if (!DRY_RUN) {
        try {
          await prisma.databaseConnection.update({
            where: { id: conn.id },
            data: updates,
          })
          rowsUpdated++
        } catch (err) {
          errors++
          console.error(`  [ERROR]  ${conn.id} — ${err instanceof Error ? err.message : err}`)
        }
      } else {
        rowsUpdated++ // count as "would update" in dry-run
      }
    }
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log('  Summary')
  console.log(`${'─'.repeat(60)}`)
  console.log(`  Processed : ${rowsProcessed}`)
  console.log(`  ${DRY_RUN ? 'Would update' : 'Updated'}    : ${rowsUpdated}`)
  console.log(`  Skipped   : ${rowsSkipped} (already encrypted)`)
  if (errors > 0) console.log(`  Errors    : ${errors}`)
  console.log(`  Mode      : ${DRY_RUN ? 'DRY RUN — no changes written' : 'LIVE — changes committed'}`)
  console.log(`${'─'.repeat(60)}\n`)

  if (errors > 0) process.exit(1)
}

main()
  .catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
