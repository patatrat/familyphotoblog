import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { neonConfig } from "@neondatabase/serverless"
import ws from "ws"
import dotenv from "dotenv"
import path from "path"

// Load env files — prisma.config.ts handles this for CLI commands,
// but the seed script runs directly via tsx so needs its own loading.
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })
dotenv.config({ path: path.resolve(process.cwd(), ".env") })

neonConfig.webSocketConstructor = ws

const db = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
})

async function main() {
  const email = process.env.ADMIN_EMAIL
  const name = process.env.ADMIN_NAME

  if (!email || !name) {
    console.error("❌  ADMIN_EMAIL and ADMIN_NAME must be set to run the seed.")
    process.exit(1)
  }

  const existing = await db.user.findUnique({ where: { email } })

  if (existing) {
    if (existing.role !== "ADMIN") {
      await db.user.update({
        where: { email },
        data: { role: "ADMIN", approved: true },
      })
      console.log(`✓ Promoted existing user ${email} to ADMIN.`)
    } else {
      console.log(`✓ Admin user ${email} already exists — nothing to do.`)
    }
    return
  }

  await db.user.create({
    data: { name, email, role: "ADMIN", approved: true },
  })

  console.log(`✓ Created admin user: ${name} <${email}>`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
