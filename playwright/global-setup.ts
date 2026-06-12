import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { neonConfig } from "@neondatabase/serverless"
import ws from "ws"
import { writeFileSync, mkdirSync } from "fs"
import { randomUUID } from "crypto"
import path from "path"
import dotenv from "dotenv"

// Allow E2E_DATABASE_URL to live in .env.local for local runs
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })
dotenv.config({ path: path.resolve(process.cwd(), ".env") })

async function globalSetup() {
  // Deliberately no fallback to DATABASE_URL — seeding a test admin into the
  // production database by accident would be worse than an error here
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

    const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"
    const { hostname: domain, protocol } = new URL(baseUrl)
    // Auth.js only uses the __Secure- cookie prefix over HTTPS
    const isHttps = protocol === "https:"

    writeFileSync(
      path.join(authDir, "admin.json"),
      JSON.stringify(
        {
          cookies: [
            {
              name: isHttps ? "__Secure-authjs.session-token" : "authjs.session-token",
              value: sessionToken,
              domain,
              path: "/",
              expires: Math.floor(expires.getTime() / 1000),
              httpOnly: true,
              secure: isHttps,
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

globalSetup().catch((err) => {
  console.error(err)
  process.exit(1)
})
