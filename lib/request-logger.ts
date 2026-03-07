// lib/request-logger.ts
// Structured API request logger backed by Upstash Redis.
// Stores last 500 log entries (LIFO list). Tracks per-endpoint error counts
// with a 1-hour TTL for anomaly monitoring.
// All Redis ops are fail-open: failures are logged to console but never throw.

import { redis } from '@/lib/rate-limit'

export interface RequestLog {
  id: string        // UUID (from X-Request-ID header or generated)
  method: string    // HTTP method
  path: string      // Pathname only — no query string (avoids logging tokens/codes)
  status: number    // HTTP status code
  duration: number  // Request duration in milliseconds
  userId?: string   // Authenticated user ID if available
  ip?: string       // Client IP address
  timestamp: string // ISO 8601
}

const LOG_KEY = 'api:logs'
const LOG_MAX = 500

/**
 * Appends a request log entry to Redis and increments error counters for 5xx responses.
 * Trims the log list to LOG_MAX entries after each insert.
 */
export async function logRequest(log: RequestLog): Promise<void> {
  try {
    await redis.lpush(LOG_KEY, JSON.stringify(log))
    await redis.ltrim(LOG_KEY, 0, LOG_MAX - 1)

    // Track 5xx errors per endpoint with a 1-hour sliding window
    if (log.status >= 500) {
      const errKey = `api:errors:${log.path}`
      const count = await redis.incr(errKey)
      // Only set TTL on first increment to avoid resetting the window
      if (count === 1) {
        redis.expire(errKey, 3600).catch(() => {})
      }
    }
  } catch (err) {
    // Logging must never crash the application
    console.error('[request-logger] logRequest failed:', err)
  }
}

/**
 * Returns the most recent request logs (up to `limit`).
 * Returns [] on Redis failure — caller should handle gracefully.
 */
export async function getRecentLogs(limit = 100): Promise<RequestLog[]> {
  try {
    const raw = await redis.lrange(LOG_KEY, 0, limit - 1)
    return raw
      .map(entry => {
        try {
          return JSON.parse(entry as string) as RequestLog
        } catch {
          return null
        }
      })
      .filter((e): e is RequestLog => e !== null)
  } catch (err) {
    console.error('[request-logger] getRecentLogs failed:', err)
    return []
  }
}
