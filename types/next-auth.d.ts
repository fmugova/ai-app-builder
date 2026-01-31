import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: string
      subscriptionTier: string
      subscriptionStatus: string
      emailVerified: Date | null
      projectsThisMonth: number
      generationsUsed: number
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
    role: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    email: string
    subscriptionTier: string
    subscriptionStatus: string
    emailVerified: Date | null
    projectsThisMonth: number
    generationsUsed: number
  }
}
