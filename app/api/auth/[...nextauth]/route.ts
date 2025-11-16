import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Special handling for demo user - accept any password
          if (credentials.email === "demo@buildflow.app") {
            let user = await prisma.user.findUnique({
              where: { email: "demo@buildflow.app" },
            });
            
            // If demo user doesn't exist, create it
            if (!user) {
              user = await prisma.user.create({
                data: {
                  email: "demo@buildflow.app",
                  name: "Demo User",
                  password: "demo123",
                }
              });
            }
            
            console.log("✅ Demo user logged in");
            return {
              id: user.id,
              email: user.email,
              name: user.name || "Demo User",
            };
          }
          
          // For other users, check password normally
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) {
            console.log("❌ User not found:", credentials.email);
            return null;
          }

          // Check if password matches
          if (credentials.password === user.password) {
            console.log("✅ User logged in:", user.email);
            return {
              id: user.id,
              email: user.email,
              name: user.name || "",
            };
          }

          console.log("❌ Wrong password for:", credentials.email);
          return null;
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };