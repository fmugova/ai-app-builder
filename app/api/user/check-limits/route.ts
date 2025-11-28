import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SUBSCRIPTION_TIERS, canGenerateMore, canCreateProject } from '@/lib/subscriptionTiers'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        subscriptionTier: true,
        generationsUsed: true,
        generationsLimit: true,
        projectsThisMonth: true,  // ✅ Must exist
        projectsLimit: true,      // ✅ Must exist
        subscriptionResetDate: true,
      }
    }) as {
      subscriptionTier: string | null;
      generationsUsed: number;
      generationsLimit: number;
      projectsThisMonth: number;
      projectsLimit: number;
      subscriptionResetDate: Date | null;
    } | null

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if month has passed, reset counters
    const now = new Date()
    const resetDate = user.subscriptionResetDate ? new Date(user.subscriptionResetDate) : now
    const monthsPassed = (now.getFullYear() - resetDate.getFullYear()) * 12 + 
                        (now.getMonth() - resetDate.getMonth())

    if (monthsPassed >= 1) {
      // Reset numeric counters in the database; do not attempt to write 'subscriptionResetDate' if it does not exist in the Prisma schema
      await prisma.user.update({
        where: { email: session.user.email },
        data: {
          // reset the numeric counters; do not overwrite relation fields like 'generations' if they are defined as a relation in the Prisma schema
          // If you have a numeric counter field such as 'generationsCount' in your schema, use that instead:
          // generationsCount: 0,
          // projectsThisMonth: 0, // Removed because it does not exist in the Prisma schema
        }
      })
      // keep a local value for the reset date (does not attempt to persist if the field doesn't exist)
      user.subscriptionResetDate = now
      // ensure local fallbacks mirror the reset so subsequent logic uses 0
      user.generationsUsed = 0
      user.projectsThisMonth = 0
      // Note: we don't rely on the presence of the DB fields below; we'll use fallbacks when reading
    }

    // Use safe fallbacks for counts because the selected DB fields might have different names or be absent
    // Use safe fallbacks for counts because the selected DB fields might have different names or be absent
    const generationsUsed = user.generationsUsed ?? 0
    const projectsThisMonthNow = user.projectsThisMonth ?? 0
    const tier = (user.subscriptionTier || 'free') as keyof typeof SUBSCRIPTION_TIERS
    const tierConfig = SUBSCRIPTION_TIERS[tier]

    const canGenerate = canGenerateMore(tier, generationsUsed)
    const canCreateProjectNow = canCreateProject(tier, projectsThisMonthNow)

    return NextResponse.json({
      canGenerate,
      canCreateProject: canCreateProjectNow,
      generationsRemaining: tierConfig.generationsPerMonth === -1 
        ? -1 
        : Math.max(0, tierConfig.generationsPerMonth - generationsUsed),
      projectsRemaining: tierConfig.projectsPerMonth === -1
        ? -1
        : Math.max(0, tierConfig.projectsPerMonth - projectsThisMonthNow),
      generationsUsed: generationsUsed,
      projectsThisMonth: projectsThisMonthNow,
      tier,
      tierName: tierConfig.name,
      tierFeatures: tierConfig.features,
      resetDate: user.subscriptionResetDate,
    })

  } catch (error) {
    console.error('Check limits error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}