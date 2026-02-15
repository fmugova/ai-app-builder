import { PrismaClient } from '@prisma/client'

// Queries slower than this threshold are logged as warnings
const SLOW_QUERY_THRESHOLD_MS = 500

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'stdout', level: 'info' },
          { emit: 'stdout', level: 'warn' },
          { emit: 'stdout', level: 'error' },
        ]
      : [
          { emit: 'event', level: 'query' },  // still capture for slow-query detection
          { emit: 'stdout', level: 'error' },
        ],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

  // Slow query detection — logs warning and tracks in-process counter
  client.$on('query', (e) => {
    const durationMs = e.duration

    if (durationMs >= SLOW_QUERY_THRESHOLD_MS) {
      console.warn(
        `🐢 [slow-query] ${durationMs}ms — ${e.query.slice(0, 200)}`,
        {
          duration: durationMs,
          target: e.target,
          timestamp: e.timestamp,
        }
      )
      // Increment global slow-query counter (readable by /api/health)
      slowQueryCounter.count++
      slowQueryCounter.lastSeen = new Date()
      if (durationMs > 2000) {
        slowQueryCounter.critical++
      }
    }
  })

  return client
}

// In-process slow query counters — reset on each cold start
export const slowQueryCounter = {
  count: 0,
  critical: 0,
  lastSeen: null as Date | null,
}

export const prisma = globalForPrisma.prisma || createPrismaClient()
globalForPrisma.prisma = prisma

// Handle connection cleanup on app termination
if (typeof window === 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}

export default prisma
