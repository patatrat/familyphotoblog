import NextAuth, { type DefaultSession } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Nodemailer from "next-auth/providers/nodemailer"
import nodemailer from "nodemailer"
import { db } from "@/lib/db"
import type { Role } from "@/generated/prisma/client"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://photos.radomski.co.nz"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: Role
      approved: boolean
    } & DefaultSession["user"]
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    Nodemailer({
      server: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
      from: process.env.EMAIL_FROM,
      // Only send magic links to addresses that exist in the DB.
      // Without this, POST /api/auth/signin/nodemailer (excluded from middleware)
      // could be used to spam arbitrary addresses, bypassing application rate limits.
      async sendVerificationRequest({ identifier: email, url, provider }) {
        const user = await db.user.findUnique({ where: { email } })
        if (!user) return

        const transport = nodemailer.createTransport(provider.server as Parameters<typeof nodemailer.createTransport>[0])
        await transport.sendMail({
          to: email,
          from: provider.from,
          subject: "Sign in to Family Photos",
          text: `Sign in to Family Photos\n\n${url}\n\nIf you did not request this link, you can safely ignore this email.\n\n${APP_URL}`,
          html: `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; color: #18181b; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h2 style="font-size: 18px; margin-bottom: 4px;">Sign in to Family Photos</h2>
  <p style="font-size: 15px; color: #52525b;">Click the button below to sign in. This link expires in 24 hours.</p>
  <p style="margin-top: 24px;">
    <a href="${url}" style="background: #18181b; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
      Sign in →
    </a>
  </p>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;" />
  <p style="font-size: 12px; color: #a1a1aa;">If you did not request this link, you can safely ignore this email.</p>
</body>
</html>`,
        })
      },
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/verify",
  },
  callbacks: {
    async signIn({ user }) {
      // Only allow users created through our signup form (they have a name set)
      return !!user.name
    },
    async session({ session, user }) {
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        select: { role: true, approved: true },
      })
      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          role: dbUser?.role ?? "USER",
          approved: dbUser?.approved ?? false,
        },
      }
    },
  },
})
