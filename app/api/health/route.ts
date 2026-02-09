import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEnvironmentStatus } from '@/lib/env-validation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Health Check Endpoint
 * 
 * Returns application health status including:
 * - Database connectivity
 * - Environment configuration
 * - Uptime
 * - Version info
 * 
 * This endpoint can be used by:
 * - Load balancers for health checks
 * - Monitoring services (UptimeRobot, etc.)
 * - CI/CD pipelines for deployment verification
 * 
 * GET /api/health
 */
export async function GET() {
  const startTime = Date.now()
  const checks: Record<string, any> = {}

  // 1. Database Check
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = {
      status: 'healthy',
      message: 'Database connection successful',
      responseTime: Date.now() - startTime,
    }
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Database connection failed',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    }
  }

  // 2. Environment Configuration Check
  try {
    const envStatus = getEnvironmentStatus()
    const criticalMissing = envStatus.missing.filter(
      (v) =>
        v.includes('DATABASE') ||
        v.includes('NEXTAUTH_SECRET') ||
        v.includes('ANTHROPIC')
    )

    checks.environment = {
      status: criticalMissing.length === 0 ? 'healthy' : 'degraded',
      configured: envStatus.configured.length,
      missing: envStatus.missing.length,
      optional: envStatus.optional.length,
      criticalMissing,
    }
  } catch (error) {
    checks.environment = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Environment validation failed',
    }
  }

  // 3. Redis Check (if configured)
  if (process.env.UPSTASH_REDIS_REST_URL) {
    try {
      const redisCheck = await fetch(
        `${process.env.UPSTASH_REDIS_REST_URL}/ping`,
        {
          headers: {
            Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          },
        }
      )
      checks.redis = {
        status: redisCheck.ok ? 'healthy' : 'unhealthy',
        message: redisCheck.ok ? 'Redis connection successful' : 'Redis connection failed',
      }
    } catch (error) {
      checks.redis = {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Redis check failed',
      }
    }
  } else {
    checks.redis = {
      status: 'not_configured',
      message: 'Redis not configured (in-memory rate limiting will be used)',
    }
  }

  // 4. API Keys Check
  checks.apiKeys = {
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    stripe: !!process.env.STRIPE_SECRET_KEY,
    github: !!process.env.GITHUB_CLIENT_ID,
    vercel: !!process.env.VERCEL_API_TOKEN,
    resend: !!process.env.RESEND_API_KEY,
  }

  // 5. System Info
  checks.system = {
    nodeVersion: process.version,
    platform: process.platform,
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB',
    },
    environment: process.env.NODE_ENV,
  }

  // Determine overall health status
  const overallStatus =
    checks.database.status === 'healthy' &&
    checks.environment.status !== 'unhealthy'
      ? 'healthy'
      : checks.database.status === 'unhealthy'
      ? 'unhealthy'
      : 'degraded'

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    responseTime: Date.now() - startTime,
    checks,
    version: process.env.npm_package_version || 'unknown',
  }

  // Return appropriate HTTP status code
  const httpStatus =
    overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503

  return NextResponse.json(response, { status: httpStatus })
}

/**
 * Detailed health check (requires authentication)
 * GET /api/health?detailed=true
 */
export async function POST() {
  // For load balancers that only support POST
  return GET()
}
