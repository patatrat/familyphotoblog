import { db } from "./db"
import type { SiteSettings } from "@/generated/prisma/client"

export async function getSettings(): Promise<SiteSettings> {
  return db.siteSettings.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global" },
  })
}
