"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/session"

export async function updateSettingsAction(formData: FormData) {
  await requireAdmin()

  const signupsEnabled = formData.get("signupsEnabled") === "true"
  const approvalRequired = formData.get("approvalRequired") === "true"
  const userEventsEnabled = formData.get("userEventsEnabled") === "true"
  const userPhotosEnabled = formData.get("userPhotosEnabled") === "true"

  await db.siteSettings.upsert({
    where: { id: "global" },
    update: { signupsEnabled, approvalRequired, userEventsEnabled, userPhotosEnabled },
    create: { id: "global", signupsEnabled, approvalRequired, userEventsEnabled, userPhotosEnabled },
  })

  revalidatePath("/admin")
  revalidatePath("/admin/settings")
}

export async function approveUserAction(formData: FormData) {
  await requireAdmin()
  const userId = formData.get("userId") as string
  await db.user.update({ where: { id: userId }, data: { approved: true } })
  revalidatePath("/admin")
}
