import nodemailer from "nodemailer"

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://photos.radomski.co.nz"

export async function sendNewEventEmails(
  event: { id: string; title: string; description: string | null; date: Date },
  recipients: { email: string; name: string }[]
): Promise<void> {
  if (recipients.length === 0) return

  const eventUrl = `${APP_URL}/events/${event.id}`
  const dateStr = event.date.toLocaleDateString("en-NZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const results = await Promise.allSettled(
    recipients.map((r) =>
      transport.sendMail({
        from: process.env.EMAIL_FROM,
        to: r.email,
        subject: `New family photos: ${event.title}`,
        text: [
          `Hi ${r.name},`,
          ``,
          `New photos have been added to the family album: ${event.title} (${dateStr}).`,
          event.description ? event.description : null,
          ``,
          `View them here: ${eventUrl}`,
          ``,
          `You're receiving this because you have new event notifications turned on.`,
          `To unsubscribe, visit your account settings: ${APP_URL}/account`,
        ]
          .filter((line) => line !== null)
          .join("\n"),
        html: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; color: #18181b; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h2 style="font-size: 18px; margin-bottom: 4px;">${escHtml(event.title)}</h2>
  <p style="color: #71717a; font-size: 14px; margin-top: 0;">${escHtml(dateStr)}</p>
  ${event.description ? `<p style="font-size: 15px;">${escHtml(event.description)}</p>` : ""}
  <p style="margin-top: 24px;">
    <a href="${eventUrl}" style="background: #18181b; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
      View photos →
    </a>
  </p>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;" />
  <p style="font-size: 12px; color: #a1a1aa;">
    You're receiving this because you have new event notifications turned on.<br>
    <a href="${APP_URL}/account" style="color: #71717a;">Manage notification settings</a>
  </p>
</body>
</html>`,
      })
    )
  )

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[email] Failed to send new event notification:", result.reason)
    }
  }
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
