/**
 * Preview Cleanup Cron Job
 * 
 * Automatically deletes expired preview deployments from Vercel
 * and updates database records
 * 
 * Runs: Every hour
 * Location: app/api/cron/cleanup-previews/route.ts
 * 
 * Setup in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-previews",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const VERCEL_API_URL = 'https://api.vercel.com'
const VERCEL_TOKEN = process.env.VERCEL_TOKEN
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  try {
    // 1. Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Check if Vercel token is configured
    if (!VERCEL_TOKEN) {
      console.warn('VERCEL_TOKEN not configured, skipping cleanup')
      return NextResponse.json({
        message: 'Vercel token not configured',
        deleted: 0,
      })
    }

    // 3. Find expired previews
    const expiredPreviews = await prisma.preview.findMany({
      where: {
        expiresAt: { lte: new Date() },
        status: { not: 'EXPIRED' },
      },
    })

    let deleted = 0
    const errors: string[] = []

    // 4. Delete each expired preview
    for (const preview of expiredPreviews) {
      try {
        // Delete from Vercel
        const response = await fetch(
          `${VERCEL_API_URL}/v13/deployments/${preview.deploymentId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${VERCEL_TOKEN}`,
            },
          }
        )

        // Vercel returns 200 or 404 (if already deleted)
        if (response.ok || response.status === 404) {
          // Update status in database
          await prisma.preview.update({
            where: { id: preview.id },
            data: {
              status: 'EXPIRED',
              deletedAt: new Date(),
            },
          })

          deleted++
          console.log(`✓ Cleaned up preview: ${preview.id}`)
        } else {
          const error = await response.text()
          errors.push(`Preview ${preview.id}: ${error}`)
          console.error(`Failed to delete preview ${preview.id}:`, error)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Preview ${preview.id}: ${errorMessage}`)
        console.error(`Error cleaning up preview ${preview.id}:`, error)
      }
    }

    // 5. Also clean up very old records (> 30 days)
    const deletedOldRecords = await prisma.preview.deleteMany({
      where: {
        createdAt: {
          lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        },
      },
    })

    console.log(`
      Preview Cleanup Summary:
      - Expired previews deleted: ${deleted}
      - Old records removed: ${deletedOldRecords.count}
      - Errors: ${errors.length}
    `)

    return NextResponse.json({
      success: true,
      deleted,
      oldRecordsRemoved: deletedOldRecords.count,
      errors: errors.length > 0 ? errors : undefined,
    })

  } catch (error) {
    console.error('Preview cleanup failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        error: 'Cleanup failed',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
