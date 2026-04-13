"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireApproved } from "@/lib/session"

export async function updateAccountAction(formData: FormData) {
  const session = await requireApproved()

  const emailNewEvents = formData.get("emailNewEvents") === "true"

  await db.user.update({
    where: { id: session.user.id },
    data: { emailNewEvents },
  })

  revalidatePath("/account")
}
