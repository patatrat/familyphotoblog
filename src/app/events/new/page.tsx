import { requireApproved } from "@/lib/session"
import { getSettings } from "@/lib/settings"
import { redirect } from "next/navigation"
import { NewEventForm } from "./new-event-form"

export default async function NewEventPage() {
  const session = await requireApproved()
  const isAdmin = session.user.role === "ADMIN"

  if (!isAdmin) {
    const settings = await getSettings()
    if (!settings.userEventsEnabled) redirect("/")
  }

  return <NewEventForm isAdmin={isAdmin} />
}
