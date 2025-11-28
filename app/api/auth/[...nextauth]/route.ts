import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github' // ✅ Add this
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import type { JWT } from 'next-auth/jwt'
import type { Account, Session, User } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    githubToken?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    githubToken?: string
  }
}

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // ✅ Add GitHub Provider
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email repo', // ✅ Request repo access
        },
      },
    }),
  ],
  // ✅ Store GitHub token
  callbacks: {
    async jwt({ token, account }: { token: JWT; account: Account | null }) {
      if (account?.provider === 'github') {
        token.githubToken = account.access_token
      }
      return token
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      session.githubToken = token.githubToken as string
      return session
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }