import { requireAdmin } from "@/lib/session"
import { getSettings } from "@/lib/settings"
import { Nav } from "@/components/nav"
import { updateSettingsAction } from "@/app/actions/settings"
import Link from "next/link"

export default async function AdminSettingsPage() {
  const session = await requireAdmin()
  const settings = await getSettings()

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Nav session={session} />

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/admin"
            className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            ← Admin
          </Link>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            Site settings
          </h1>
        </div>

        <form action={updateSettingsAction} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
          <ToggleRow
            label="Signups enabled"
            description="Allow new users to create accounts using the family passphrase."
            name="signupsEnabled"
            value={settings.signupsEnabled}
          />
          <ToggleRow
            label="Approval required"
            description="New accounts must be approved by an admin before they can view photos."
            name="approvalRequired"
            value={settings.approvalRequired}
          />
          <ToggleRow
            label="User event submissions"
            description="Allow approved family members to submit new events for admin review."
            name="userEventsEnabled"
            value={settings.userEventsEnabled}
          />
          <ToggleRow
            label="User photo uploads"
            description="Allow approved family members to add photos to published events. Photos are held for admin approval before becoming visible."
            name="userPhotosEnabled"
            value={settings.userPhotosEnabled}
          />
          <ToggleRow
            label="New event email notifications"
            description="Send an email to all family members when a new event is published. Turn off when bulk-loading events at the start."
            name="eventEmailsEnabled"
            value={settings.eventEmailsEnabled}
          />
          <div className="px-6 py-4">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
            >
              Save settings
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  name,
  value,
}: {
  label: string
  description: string
  name: string
  value: boolean
}) {
  return (
    <div className="px-6 py-5 flex items-start justify-between gap-6">
      <div>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{label}</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300 cursor-pointer">
          <input type="radio" name={name} value="true" defaultChecked={value} />
          On
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300 cursor-pointer">
          <input type="radio" name={name} value="false" defaultChecked={!value} />
          Off
        </label>
      </div>
    </div>
  )
}
