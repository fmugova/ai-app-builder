import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { Adapter } from 'next-auth/adapters'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { sendSecurityAlert } from './security-emails'

// Define user roles
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

// Define subscription tiers
export enum SubscriptionTier {
  FREE = 'free',
  PRO = 'pro',
  BUSINESS = 'business',
  ENTERPRISE = 'enterprise',
}

// Usage limits per tier
export const TIER_LIMITS = {
  [SubscriptionTier.FREE]: {
    projectsPerMonth: 3,
    generationsPerMonth: 50,
    maxPages: 5,
    customDomains: 0,
    databases: 0,
    teamMembers: 1,
  },
  [SubscriptionTier.PRO]: {
    projectsPerMonth: 20,
    generationsPerMonth: 500,
    maxPages: 50,
    customDomains: 5,
    databases: 3,
    teamMembers: 3,
  },
  [SubscriptionTier.BUSINESS]: {
    projectsPerMonth: 100,
    generationsPerMonth: 2000,
    maxPages: 200,
    customDomains: 20,
    databases: 10,
    teamMembers: 10,
  },
  [SubscriptionTier.ENTERPRISE]: {
    projectsPerMonth: -1, // unlimited
    generationsPerMonth: -1,
    maxPages: -1,
    customDomains: -1,
    databases: -1,
    teamMembers: -1,
  },
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: false, // CRITICAL: Prevent account takeover via OAuth
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required')
        }

        // Check for account lockout (IP-based rate limiting)
        // Note: In production, pass IP from request context
        const ipAddress = 'unknown' // Should be passed from API route context
        
        const failedAttempts = await prisma.failedLoginAttempt.findUnique({
          where: { 
            email_ipAddress: { 
              email: credentials.email, 
              ipAddress 
            } 
          }
        })

        // Check if account is locked
        if (failedAttempts?.lockedUntil && failedAttempts.lockedUntil > new Date()) {
          const minutesLeft = Math.ceil((failedAttempts.lockedUntil.getTime() - Date.now()) / 60000)
          throw new Error(`Account temporarily locked. Try again in ${minutesLeft} minutes.`)
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            subscriptions: true,
          },
        })

        if (!user || !user.password) {
          // Track failed login attempt
          await trackFailedLogin(credentials.email, ipAddress)
          throw new Error('Invalid credentials')
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          // Track failed login attempt
          await trackFailedLogin(credentials.email, ipAddress)
          throw new Error('Invalid credentials')
        }

        // Check if email is verified
        if (!user.emailVerified) {
          throw new Error('Please verify your email before signing in')
        }

        // Reset failed attempts on successful login
        await resetFailedAttempts(credentials.email, ipAddress)

        // Log successful login (IP tracking handled at API route level)
        await logSecurityEvent(user.id, 'login_credentials', {
          severity: 'info',
          email: credentials.email,
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session, account }) {
      // Log security event on sign in
      if (trigger === 'signIn' && user) {
        // Note: IP and User Agent should be captured at middleware/API route level
        // and passed through session context if needed
        await logSecurityEvent(user.id, 'login', {
          severity: 'info',
          provider: account?.provider || 'credentials',
          timestamp: new Date().toISOString(),
        })
      }

      // Initial sign in
      if (user) {
        token.id = user.id
        token.role = user.role
        token.email = user.email
      }

      // Fetch fresh user data on each token refresh
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          include: {
            subscriptions: true,
          },
        })

        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.emailVerified = dbUser.emailVerified
          
          // Use subscription.plan OR user.subscriptionTier (User model has both)
          token.subscriptionTier = dbUser.subscriptions?.plan || dbUser.subscriptionTier || 'free'
          token.subscriptionStatus = dbUser.subscriptions?.status || dbUser.subscriptionStatus || 'active'
          
          // Use existing User fields for usage tracking (already calculated in User model)
          token.projectsThisMonth = dbUser.projectsThisMonth || 0
          token.generationsUsed = dbUser.generationsUsed || 0
        }
      }

      // Handle session updates
      if (trigger === 'update' && session) {
        token = { ...token, ...session }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.subscriptionTier = token.subscriptionTier as string
        session.user.subscriptionStatus = token.subscriptionStatus as string
        session.user.emailVerified = token.emailVerified as Date | null
        session.user.projectsThisMonth = token.projectsThisMonth as number
        session.user.generationsUsed = token.generationsUsed as number
      }
      return session
    },
  },
  events: {
    async signIn({ user, isNewUser, account }) {
      // Log security event for all sign-ins
      await logSecurityEvent(user.id, isNewUser ? 'signup' : 'login', {
        severity: 'info',
        provider: account?.provider || 'credentials',
        isNewUser,
      })

      if (isNewUser) {
        console.log(`New user signed up: ${user.email}`)
        
        // Send welcome email (implement this)
        // await sendWelcomeEmail(user.email)
      }
    },
    async signOut({ token }) {
      if (token.id) {
        await logSecurityEvent(token.id as string, 'logout', {
          severity: 'info',
        })
      }
      console.log(`User signed out: ${token.email}`)
    },
  },
  debug: process.env.NODE_ENV === 'development',
}

/**
 * Track failed login attempts and implement account lockout
 */
async function trackFailedLogin(email: string, ipAddress: string): Promise<void> {
  try {
    const existing = await prisma.failedLoginAttempt.findUnique({
      where: { email_ipAddress: { email, ipAddress } }
    })

    if (existing) {
      const newAttempts = existing.attempts + 1
      
      // Lock account after 5 failed attempts
      if (newAttempts >= 5) {
        await prisma.failedLoginAttempt.update({
          where: { email_ipAddress: { email, ipAddress } },
          data: {
            attempts: newAttempts,
            lockedUntil: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
          }
        })
        
        // Log security event
        await logSecurityEvent(email, 'account_locked', {
          severity: 'critical',
          ipAddress,
          attempts: newAttempts,
        })
        
        // Send email notification
        const user = await prisma.user.findUnique({ where: { email } })
        if (user) {
          await sendSecurityAlert(user.id, 'account_locked', {
            ipAddress,
            attempts: newAttempts,
          })
        }
      } else {
        await prisma.failedLoginAttempt.update({
          where: { email_ipAddress: { email, ipAddress } },
          data: { attempts: newAttempts }
        })
      }
    } else {
      await prisma.failedLoginAttempt.create({
        data: {
          email,
          ipAddress,
          attempts: 1
        }
      })
    }

    // Log failed login attempt
    await logSecurityEvent(email, 'failed_login', {
      severity: 'warning',
      ipAddress,
    })
    
    // Send email notification after 3 failed attempts
    if (existing && existing.attempts >= 2) {
      const user = await prisma.user.findUnique({ where: { email } })
      if (user) {
        await sendSecurityAlert(user.id, 'failed_login', {
          ipAddress,
          attempts: existing.attempts + 1,
        })
      }
    }
  } catch (error) {
    console.error('Failed to track login attempt:', error)
  }
}

/**
 * Reset failed login attempts on successful login
 */
async function resetFailedAttempts(email: string, ipAddress: string): Promise<void> {
  try {
    await prisma.failedLoginAttempt.deleteMany({
      where: {
        email,
        ipAddress
      }
    })
  } catch (error) {
    console.error('Failed to reset login attempts:', error)
  }
}

// Helper function to check if user has permission
export async function checkUserPermission(
  userId: string,
  action: 'create_project' | 'create_database' | 'add_domain' | 'invite_member'
): Promise<{ allowed: boolean; reason?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscriptions: true },
  })

  if (!user) {
    return { allowed: false, reason: 'User not found' }
  }

  // Get tier from subscription.plan or user.subscriptionTier
  const tier = (user.subscriptions?.plan || user.subscriptionTier || 'free') as SubscriptionTier
  const limits = TIER_LIMITS[tier]

  // Check specific permissions based on action
  switch (action) {
    case 'create_project': {
      // Use existing User.projectsThisMonth field
      if (limits.projectsPerMonth !== -1 && user.projectsThisMonth >= limits.projectsPerMonth) {
        return {
          allowed: false,
          reason: `Project limit reached (${limits.projectsPerMonth}/month). Upgrade to create more.`,
        }
      }
      break
    }

    case 'create_database': {
      const dbCount = await prisma.databaseConnection.count({
        where: { userId },
      })
      
      if (limits.databases !== -1 && dbCount >= limits.databases) {
        return {
          allowed: false,
          reason: `Database limit reached (${limits.databases} max). Upgrade to add more.`,
        }
      }
      break
    }

    case 'add_domain': {
      const domainCount = await prisma.customDomain.count({
        where: {
          project: { userId },
        },
      })
      
      if (limits.customDomains !== -1 && domainCount >= limits.customDomains) {
        return {
          allowed: false,
          reason: `Custom domain limit reached (${limits.customDomains} max). Upgrade to add more.`,
        }
      }
      break
    }

    case 'invite_member': {
      // For future team functionality
      if (limits.teamMembers !== -1) {
        return {
          allowed: false,
          reason: `Team member limit reached (${limits.teamMembers} max). Upgrade to add more.`,
        }
      }
      break
    }
  }

  return { allowed: true }
}

// Helper to check if user owns a resource
export async function verifyResourceOwnership(
  userId: string,
  resourceType: 'project' | 'database' | 'domain',
  resourceId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  // Admins have access to everything
  if (user?.role === UserRole.ADMIN) {
    return true
  }

  switch (resourceType) {
    case 'project': {
      const project = await prisma.project.findFirst({
        where: { id: resourceId, userId },
      })
      return !!project
    }

    case 'database': {
      const database = await prisma.databaseConnection.findFirst({
        where: { id: resourceId, userId },
      })
      return !!database
    }

    case 'domain': {
      const domain = await prisma.customDomain.findFirst({
        where: {
          id: resourceId,
          project: { userId },
        },
      })
      return !!domain
    }

    default:
      return false
  }
}

// Helper to increment usage counters
export async function incrementUsage(
  userId: string,
  type: 'project' | 'generation'
): Promise<void> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionResetDate: true },
  })

  // Check if we need to reset counters (new month)
  if (user?.subscriptionResetDate && user.subscriptionResetDate < startOfMonth) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        projectsThisMonth: 0,
        generationsUsed: 0,
        subscriptionResetDate: startOfMonth,
      },
    })
  }

  // Increment the appropriate counter
  if (type === 'project') {
    await prisma.user.update({
      where: { id: userId },
      data: {
        projectsThisMonth: { increment: 1 },
      },
    })
  } else if (type === 'generation') {
    await prisma.user.update({
      where: { id: userId },
      data: {
        generationsUsed: { increment: 1 },
      },
    })
  }
}

// Helper to get user's current limits
export async function getUserLimits(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscriptions: true },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const tier = (user.subscriptions?.plan || user.subscriptionTier || 'free') as SubscriptionTier
  const limits = TIER_LIMITS[tier]

  return {
    tier,
    limits,
    usage: {
      projects: user.projectsThisMonth,
      generations: user.generationsUsed,
    },
  }
}

// Helper to check if user is admin
export async function isUserAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  
  return user?.role === UserRole.ADMIN
}

// Helper to check subscription status
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscriptions: true },
  })
  
  if (!user) return false
  
  const status = user.subscriptions?.status || user.subscriptionStatus
  return status === 'active' || status === 'trialing'
}

// Helper to validate email ownership
export async function verifyEmailOwnership(
  userId: string,
  email: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  
  return user?.email === email
}

// Security audit log helper
export async function logSecurityEvent(
  userId: string,
  event: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    // Store security event in database
    await prisma.securityEvent.create({
      data: {
        userId,
        type: event,
        ipAddress: details?.ipAddress as string | undefined,
        userAgent: details?.userAgent as string | undefined,
        metadata: details ? JSON.parse(JSON.stringify(details)) : null,
        severity: (details?.severity as string) || 'info',
      },
    })
  } catch (error) {
    // Fallback to console logging if database write fails
    console.error('[Security Event Log Failed]', {
      userId,
      event,
      details,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
  }
}