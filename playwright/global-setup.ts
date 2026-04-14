import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { neonConfig } from "@neondatabase/serverless"
import ws from "ws"
import { writeFileSync, mkdirSync } from "fs"
import { randomUUID } from "crypto"
import path from "path"

export default async function globalSetup() {
  const databaseUrl = process.env.E2E_DATABASE_URL
  if (!databaseUrl) {
    throw new Error("E2E_DATABASE_URL is required for E2E tests")
  }

  neonConfig.webSocketConstructor = ws
  const adapter = new PrismaNeon({ connectionString: databaseUrl })
  const db = new PrismaClient({ adapter })

  try {
    // Upsert the E2E admin test user
    const admin = await db.user.upsert({
      where: { email: "e2e-admin@radomski.test" },
      create: {
        name: "E2E Admin",
        email: "e2e-admin@radomski.test",
        role: "ADMIN",
        approved: true,
        emailVerified: new Date(),
      },
      update: {
        role: "ADMIN",
        approved: true,
      },
    })

    // Clear old sessions and create a fresh one
    await db.session.deleteMany({ where: { userId: admin.id } })
    const sessionToken = randomUUID()
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    await db.session.create({
      data: { sessionToken, userId: admin.id, expires },
    })

    // Write Playwright storage state with the session cookie
    const authDir = path.join(process.cwd(), "playwright/.auth")
    mkdirSync(authDir, { recursive: true })

    const baseUrl =
      process.env.PLAYWRIGHT_BASE_URL ?? "https://photos-staging.radomski.co.nz"
    const domain = new URL(baseUrl).hostname

    writeFileSync(
      path.join(authDir, "admin.json"),
      JSON.stringify(
        {
          cookies: [
            {
              name: "__Secure-authjs.session-token",
              value: sessionToken,
              domain,
              path: "/",
              expires: Math.floor(expires.getTime() / 1000),
              httpOnly: true,
              secure: true,
              sameSite: "Lax",
            },
          ],
          origins: [],
        },
        null,
        2
      )
    )

    console.log(`E2E setup complete — admin user id: ${admin.id}`)
  } finally {
    await db.$disconnect()
  }
}
