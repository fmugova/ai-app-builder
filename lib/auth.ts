import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { Adapter } from 'next-auth/adapters'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { sendSecurityAlert } from './security-emails'
import {
  logSecurityEvent,
  checkAccountLockout,
  trackFailedLoginAttempt,
  resetFailedLoginAttempts,
  detectSuspiciousActivity
} from './security'

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
  // Add custom error pages configuration
  useSecureCookies: process.env.NODE_ENV === 'production',
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: false, // CRITICAL: Prevent account takeover via OAuth
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: false,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        twoFactorToken: { label: '2FA Token', type: 'text', optional: true },
      },
      async authorize(credentials, req) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error('Email and password required')
          }

          // Extract real IP from request headers (Cloudflare → forwarded → socket)
          const ipAddress =
            (req?.headers?.['cf-connecting-ip'] as string) ||
            (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
            (req?.headers?.['x-real-ip'] as string) ||
            'unknown'
          const userAgent = (req?.headers?.['user-agent'] as string) || 'unknown'
          
          // Use comprehensive lockout check from lib/security.ts
          const lockoutCheck = await checkAccountLockout(credentials.email, ipAddress)
          
          if (lockoutCheck.isLocked) {
            const minutesLeft = Math.ceil(((lockoutCheck.lockedUntil?.getTime() || 0) - Date.now()) / 60000)
            throw new Error(`Account temporarily locked. Try again in ${minutesLeft} minutes.`)
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              email: true,
              password: true,
              emailVerified: true,
              twoFactorRequired: true,
              twoFactorEnabled: true,
              twoFactorSecret: true,
              twoFactorBackupCodes: true,
              name: true,
              role: true,
              image: true,
            },
          })


          if (!user || !user.password) {
            // Track failed login attempt using comprehensive function
            await trackFailedLoginAttempt(credentials.email, ipAddress, userAgent)
            const error = new Error('Invalid credentials')
            error.name = 'INVALID_CREDENTIALS'
            throw error
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )


          if (!isPasswordValid) {
            // Track failed login attempt using comprehensive function
            await trackFailedLoginAttempt(credentials.email, ipAddress, userAgent)
            const error = new Error('Invalid credentials')
            error.name = 'INVALID_CREDENTIALS'
            throw error
          }

          // Check if email is verified (must be a valid date)

          if (!user.emailVerified || isNaN(new Date(user.emailVerified).getTime())) {
            const error = new Error('Please verify your email before signing in')
            error.name = 'EMAIL_NOT_VERIFIED'
            throw error
          }

          // Enforce 2FA setup for users who require it
          if (user.twoFactorRequired && !user.twoFactorEnabled) {
            const error = new Error('Two-factor authentication setup required. Please enable 2FA to continue.')
            error.name = 'TWO_FACTOR_ONBOARDING_REQUIRED'
            throw error
          }

          // Check if 2FA is enabled and validate token if provided
          if (user.twoFactorEnabled && user.twoFactorSecret) {
            const twoFactorToken = (credentials as Record<string, string>).twoFactorToken
            
            if (!twoFactorToken) {
              // Return null but throw a specific error that can be caught
              // We'll use a custom error that the client can detect
              const error = new Error('2FA_REQUIRED')
              error.name = '2FA_REQUIRED'
              throw error
            }

            // Verify 2FA token
            const speakeasy = await import('speakeasy')
            const verified = speakeasy.totp.verify({
              secret: user.twoFactorSecret,
              encoding: 'base32',
              token: twoFactorToken,
              window: 2
            })

            if (!verified) {
              // Check if it's a backup code (hashed comparison)
              const storedHashes = user.twoFactorBackupCodes ?? []
              const matchedIndex = (
                await Promise.all(storedHashes.map(hash => bcrypt.compare(twoFactorToken, hash)))
              ).findIndex(Boolean)

              if (matchedIndex === -1) {
                await trackFailedLoginAttempt(credentials.email, ipAddress, userAgent)
                throw new Error('Invalid 2FA code')
              }

              // Remove used backup code
              const updatedBackupCodes = [...storedHashes]
              updatedBackupCodes.splice(matchedIndex, 1)
              
              await prisma.user.update({
                where: { id: user.id },
                data: { twoFactorBackupCodes: updatedBackupCodes }
              })

              await logSecurityEvent({
                userId: user.id,
                type: 'login_2fa_backup',
                action: 'success',
                ipAddress,
                userAgent,
                severity: 'warning',
                metadata: { backupCodesRemaining: updatedBackupCodes.length }
              })
            }
          }

          // Reset failed attempts on successful login
          await resetFailedLoginAttempts(credentials.email, ipAddress)

          // Check for suspicious activity
          const suspiciousCheck = await detectSuspiciousActivity(
            user.id,
            ipAddress,
            userAgent
          )

          if (suspiciousCheck.isSuspicious) {
            // Send email notification for new location login
            await sendSecurityAlert(user.id, 'new_login_location', {
              ipAddress,
              device: userAgent,
              location: ipAddress, // Could be enhanced with IP geolocation
            })
          }

          // Update user login tracking
          await prisma.user.update({
            where: { id: user.id },
            data: {
              lastLoginAt: new Date(),
              lastLoginIp: ipAddress,
              failedLoginAttempts: 0,
            },
          })

          // Log successful login using comprehensive function
          await logSecurityEvent({
            userId: user.id,
            type: 'login_credentials',
            action: 'success',
            ipAddress,
            userAgent,
            severity: 'info',
          })

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
          }
        } catch (error) {
          console.error('[AUTH ERROR]', error)
          throw error
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.emailVerified = user.emailVerified ?? null;
        token.roleRefreshedAt = Date.now();
      }

      // Refresh role + emailVerified from DB every 15 minutes or on explicit update
      const ROLE_TTL_MS = 15 * 60 * 1000
      const shouldRefresh =
        trigger === 'update' ||
        (token.id && (!token.roleRefreshedAt || Date.now() - (token.roleRefreshedAt as number) > ROLE_TTL_MS))

      if (shouldRefresh && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { emailVerified: true, role: true },
        });
        if (dbUser) {
          token.emailVerified = dbUser.emailVerified;
          token.role = dbUser.role;
          token.roleRefreshedAt = Date.now();
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.emailVerified = token.emailVerified as Date | null;
      }
      return session;
    }
  },
  events: {
    async signIn({ user, isNewUser, account }) {
      // Log security event for all sign-ins
      await logSecurityEvent({
        userId: user.id,
        type: isNewUser ? 'signup' : 'login',
        action: 'success',
        metadata: {
          provider: account?.provider || 'credentials',
          isNewUser,
        },
        severity: 'info',
      })

      if (isNewUser) {
        // New user signed in for the first time — handled via security event logging above
        
        // Send welcome email (implement this)
        // await sendWelcomeEmail(user.email)
      }
    },
    async signOut({ token }) {
      if (token.id) {
        await logSecurityEvent({
          userId: token.id as string,
          type: 'logout',
          action: 'success',
          severity: 'info',
        })
      }
      console.log(`User signed out: ${token.email}`)
    },
  },
}

// Helper function to check if user has permission
export async function checkUserPermission(
  userId: string,
  action: 'create_project' | 'create_database' | 'add_domain' | 'invite_member'
): Promise<{ allowed: boolean; reason?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { Subscription: true },
  })

  if (!user) {
    return { allowed: false, reason: 'User not found' }
  }

  // Get tier from subscription.plan or user.subscriptionTier
  const tier = (user.Subscription?.plan || user.subscriptionTier || 'free') as SubscriptionTier
  const limits = TIER_LIMITS[tier]

  // Check specific permissions based on action
  switch (action) {
    case 'create_project': {
      // Use existing user.projectsThisMonth field
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
          Project: { userId },
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
          Project: { userId },
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
    include: { Subscription: true },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const tier = (user.Subscription?.plan || user.subscriptionTier || 'free') as SubscriptionTier
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
    include: { Subscription: true },
  })
  
  if (!user) return false
  
  const status = user.Subscription?.status || user.subscriptionStatus
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
