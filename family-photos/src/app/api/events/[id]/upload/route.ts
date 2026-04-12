import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import sharp from "sharp"
import exifr from "exifr"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/session"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params

  let session
  try {
    session = await requireAdmin()
  } catch {
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

  const mimeType = file.type
  if (!mimeType.startsWith("image/")) {
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
    // EXIF extraction failed — not critical
  }

  const baseName = `${eventId}/${Date.now()}-${Math.random().toString(36).slice(2)}`

  // Process all three versions
  const [originalBuf, thumbBuf, midBuf] = await Promise.all([
    // Original: strip EXIF only
    sharp(buffer).rotate().withExifMerge({}).toBuffer(),
    // Thumbnail: 400px wide, strip EXIF
    sharp(buffer).rotate().resize({ width: 400, withoutEnlargement: true }).withExifMerge({}).toBuffer(),
    // Mid-size: 1200px wide, strip EXIF
    sharp(buffer).rotate().resize({ width: 1200, withoutEnlargement: true }).withExifMerge({}).toBuffer(),
  ])

  // Upload all three to Vercel Blob
  const [original, thumb, mid] = await Promise.all([
    put(`photos/${baseName}-orig.jpg`, originalBuf, { access: "public", contentType: "image/jpeg" }),
    put(`photos/${baseName}-thumb.jpg`, thumbBuf, { access: "public", contentType: "image/jpeg" }),
    put(`photos/${baseName}-mid.jpg`, midBuf, { access: "public", contentType: "image/jpeg" }),
  ])

  // Determine sort order (EXIF time if available, else now)
  const sortMs = takenAt ? takenAt.getTime() : Date.now()

  const photo = await db.photo.create({
    data: {
      eventId,
      uploadedBy: session.user.id,
      blobUrl: original.url,
      thumbnailUrl: thumb.url,
      midSizeUrl: mid.url,
      takenAt,
      sortOrder: sortMs,
    },
  })

  return NextResponse.json({ photoId: photo.id, thumbnailUrl: photo.thumbnailUrl })
}
