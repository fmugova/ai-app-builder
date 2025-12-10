import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import GitHubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          // Request repo scope for GitHub integration
          scope: "read:user user:email repo",
        },
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("[Auth] Credentials login attempt for:", credentials?.email)
        
        if (!credentials?.email || !credentials?.password) {
          console.log("[Auth] Missing email or password")
          throw new Error("Invalid credentials")
        }

        // Normalize email to lowercase for lookup
        const normalizedEmail = credentials.email.toLowerCase().trim()
        console.log("[Auth] Looking up user:", normalizedEmail)

        try {
          const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
          })

          if (!user) {
            console.log("[Auth] User not found:", normalizedEmail)
            throw new Error("Invalid credentials")
          }

          if (!user.password) {
            console.log("[Auth] User has no password (OAuth account):", normalizedEmail)
            throw new Error("Please sign in with Google or GitHub")
          }

          const isValid = await bcrypt.compare(credentials.password, user.password)

          if (!isValid) {
            console.log("[Auth] Invalid password for:", normalizedEmail)
            throw new Error("Invalid credentials")
          }

          console.log("[Auth] Successful login for:", normalizedEmail)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          }
        } catch (error: any) {
          console.error("[Auth] Database error:", error.message)
          throw new Error("Invalid credentials")
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  events: {
    // Log sign-in activity for all users
    async signIn({ user, account }) {
      try {
        if (user?.id) {
          await prisma.activity.create({
            data: {
              userId: user.id,
              type: 'auth',
              action: 'signed_in',
              metadata: {
                provider: account?.provider || 'credentials',
                email: user.email
              }
            }
          })
          console.log(`[Auth] User signed in: ${user.email}`)
        }
      } catch (error) {
        console.error('[Auth] Failed to log sign-in activity:', error)
      }
    },
    // Log new user creation (for OAuth sign-ups)
    async createUser({ user }) {
      try {
        if (user?.id) {
          await prisma.activity.create({
            data: {
              userId: user.id,
              type: 'auth',
              action: 'signup',
              metadata: {
                email: user.email,
                name: user.name,
                method: 'oauth'
              }
            }
          })
          console.log(`[Auth] New user created via OAuth: ${user.email}`)
        }
      } catch (error) {
        console.error('[Auth] Failed to log user creation activity:', error)
      }
    }
  },
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.id = user.id
      }

      // Save GitHub access token when user signs in with GitHub
      if (account?.provider === "github" && account.access_token) {
        token.githubAccessToken = account.access_token
        
        // Fetch GitHub username (non-blocking - don't fail auth if this fails)
        try {
          const res = await fetch("https://api.github.com/user", {
            headers: { Authorization: `token ${account.access_token}` },
          })
          if (res.ok) {
            const githubUser = await res.json()
            token.githubUsername = githubUser.login
            
            // Save to database (async, don't block auth)
            if (user?.id) {
              prisma.user.update({
                where: { id: user.id },
                data: {
                  githubAccessToken: account.access_token,
                  githubUsername: githubUser.login,
                },
              }).catch(err => console.error("[Auth] Failed to save GitHub info:", err))
            }
          }
        } catch (error) {
          // Log but don't fail authentication
          console.error("[Auth] Failed to fetch GitHub user:", error)
        }
      }

      // Handle session updates
      if (trigger === "update" && session) {
        token.name = session.name
        token.picture = session.image
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        // Include GitHub info in session
        ;(session.user as any).githubUsername = token.githubUsername
        ;(session.user as any).hasGithubConnected = !!token.githubAccessToken
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
}