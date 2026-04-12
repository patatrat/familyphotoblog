import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import sharp from "sharp"
import exifr from "exifr"
import { db } from "@/lib/db"
import { auth } from "@/auth"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params

    // Check auth directly — don't use requireAdmin() since redirect() throws in route handlers
    const session = await auth()
    const role = (session?.user as { role?: string } | undefined)?.role
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const event = await db.event.findUnique({ where: { id: eventId } })
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Extract EXIF date before sharp strips it
    let takenAt: Date | null = null
    try {
      const exif = await exifr.parse(buffer, ["DateTimeOriginal", "CreateDate"])
      const raw = exif?.DateTimeOriginal ?? exif?.CreateDate
      if (raw instanceof Date && !isNaN(raw.getTime())) {
        takenAt = raw
      }
    } catch {
      // Non-critical — some images have no EXIF
    }

    const baseName = `${eventId}/${Date.now()}-${Math.random().toString(36).slice(2)}`

    // Sharp strips EXIF by default; .rotate() applies EXIF orientation before stripping
    const [originalBuf, thumbBuf, midBuf] = await Promise.all([
      sharp(buffer).rotate().jpeg({ quality: 90 }).toBuffer(),
      sharp(buffer).rotate().resize({ width: 400, withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer(),
      sharp(buffer).rotate().resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer(),
    ])

    const [original, thumb, mid] = await Promise.all([
      put(`photos/${baseName}-orig.jpg`, originalBuf, { access: "private", contentType: "image/jpeg" }),
      put(`photos/${baseName}-thumb.jpg`, thumbBuf, { access: "private", contentType: "image/jpeg" }),
      put(`photos/${baseName}-mid.jpg`, midBuf, { access: "private", contentType: "image/jpeg" }),
    ])

    const sortMs = takenAt ? takenAt.getTime() : Date.now()

    const photo = await db.photo.create({
      data: {
        eventId,
        uploadedBy: session.user.id!,
        blobUrl: original.url,
        thumbnailUrl: thumb.url,
        midSizeUrl: mid.url,
        takenAt,
        sortOrder: sortMs,
      },
    })

    return NextResponse.json({ photoId: photo.id, thumbnailUrl: photo.thumbnailUrl })
  } catch (err) {
    console.error("[upload] error:", err)
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
