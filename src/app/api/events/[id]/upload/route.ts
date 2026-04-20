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
    const user = session?.user as { id?: string; role?: string; approved?: boolean } | undefined
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const isAdmin = user.role === "ADMIN"
    if (!isAdmin && !user.approved) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { getSettings } = await import("@/lib/settings")
    if (!isAdmin) {
      const settings = await getSettings()
      if (!settings.userPhotosEnabled) {
        return NextResponse.json({ error: "Photo uploads are not enabled." }, { status: 403 })
      }
    }

    const event = await db.event.findUnique({ where: { id: eventId } })
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }
    if (event.status !== "PUBLISHED" && !isAdmin) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
    const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "tiff", "tif", "heic", "heif"])
    const isImage = file.type.startsWith("image/") || IMAGE_EXTS.has(ext)
    if (!isImage) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Extract EXIF date before any conversion strips it
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

    // Vercel's sharp binary includes libheif but without the HEVC codec that Apple HEIC requires.
    // Convert HEIC/HEIF to JPEG first using heic-convert (WASM libheif with HEVC support).
    let processBuffer = buffer
    if (ext === "heic" || ext === "heif" || file.type === "image/heic" || file.type === "image/heif") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const heicConvert = require("heic-convert") as (opts: { buffer: Buffer; format: string; quality: number }) => Promise<ArrayBuffer>
      const converted = await heicConvert({ buffer, format: "JPEG", quality: 0.95 })
      processBuffer = Buffer.from(converted)
    }

    const baseName = `${eventId}/${Date.now()}-${Math.random().toString(36).slice(2)}`

    // Sharp strips EXIF by default; .rotate() applies EXIF orientation before stripping
    // Original is not stored — this is a sharing site, not a backup service
    const [thumbBuf, midBuf] = await Promise.all([
      sharp(processBuffer).rotate().resize({ width: 400, withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer(),
      sharp(processBuffer).rotate().resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer(),
    ])

    const [thumb, mid] = await Promise.all([
      put(`photos/${baseName}-thumb.jpg`, thumbBuf, { access: "private", contentType: "image/jpeg" }),
      put(`photos/${baseName}-mid.jpg`, midBuf, { access: "private", contentType: "image/jpeg" }),
    ])

    // sortOrder is Int — store Unix seconds (not ms) to stay within 32-bit range
    const sortOrder = Math.floor((takenAt ? takenAt.getTime() : Date.now()) / 1000)

    const photo = await db.photo.create({
      data: {
        eventId,
        uploadedBy: user.id,
        thumbnailUrl: thumb.url,
        midSizeUrl: mid.url,
        takenAt,
        sortOrder,
        status: isAdmin ? "VISIBLE" : "PENDING",
      },
    })

    return NextResponse.json({
      photoId: photo.id,
      thumbnailUrl: photo.thumbnailUrl,
      pending: !isAdmin,
    })
  } catch (err) {
    console.error("[upload] error:", err)
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
