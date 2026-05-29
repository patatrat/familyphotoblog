#!/usr/bin/env node
/**
 * One-shot migration: re-encode existing JPEG/PNG photos as WebP.
 *
 * For each photo whose thumbnailUrl does not already end with .webp:
 *   1. Fetch thumbnail + mid-size buffers from Vercel Blob
 *   2. Re-encode as WebP (thumb q=80, mid q=82) via sharp
 *   3. Upload WebP versions to Vercel Blob (new path, same key structure)
 *   4. Update DB record with new URLs
 *   5. Delete old blobs
 *
 * Required env vars:
 *   DATABASE_URL           – Neon Postgres connection string
 *   BLOB_READ_WRITE_TOKEN  – Vercel Blob token
 *
 * Usage:
 *   node --env-file=.env.local scripts/convert-to-webp.mjs
 *   node --env-file=.env.local scripts/convert-to-webp.mjs --dry-run
 */

import { PrismaClient } from "@prisma/client"
import { put, del } from "@vercel/blob"
import sharp from "sharp"

const isDryRun = process.argv.includes("--dry-run")

const token = process.env.BLOB_READ_WRITE_TOKEN
if (!token) {
  console.error("Missing env var: BLOB_READ_WRITE_TOKEN")
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error("Missing env var: DATABASE_URL")
  process.exit(1)
}

const db = new PrismaClient()

async function fetchBlobBuffer(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Blob fetch failed: ${res.status} ${res.statusText} — ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

function blobPathFromUrl(url) {
  // Extracts the path portion of a Vercel Blob URL, e.g.
  // https://abc.blob.vercel-storage.com/photos/evt/1234-abc-thumb.jpg
  //   → photos/evt/1234-abc-thumb.jpg
  return new URL(url).pathname.slice(1)
}

function toWebpPath(blobPath) {
  return blobPath.replace(/\.[^./]+$/, ".webp")
}

const photos = await db.photo.findMany({
  where: { thumbnailUrl: { not: { endsWith: ".webp" } } },
  select: { id: true, thumbnailUrl: true, midSizeUrl: true },
  orderBy: { createdAt: "asc" },
})

console.log(`Found ${photos.length} photos to convert${isDryRun ? " (dry run — no changes will be made)" : ""}`)
if (photos.length === 0) {
  await db.$disconnect()
  process.exit(0)
}

let converted = 0
let failed = 0

for (let i = 0; i < photos.length; i++) {
  const photo = photos[i]
  const thumbPath = blobPathFromUrl(photo.thumbnailUrl)
  const midPath   = blobPathFromUrl(photo.midSizeUrl)
  const newThumbPath = toWebpPath(thumbPath)
  const newMidPath   = toWebpPath(midPath)

  if (isDryRun) {
    console.log(`[${i + 1}/${photos.length}] ${photo.id}`)
    console.log(`  thumb: ${thumbPath} → ${newThumbPath}`)
    console.log(`  mid:   ${midPath} → ${newMidPath}`)
    converted++
    continue
  }

  try {
    // Fetch originals in parallel
    const [thumbBuf, midBuf] = await Promise.all([
      fetchBlobBuffer(photo.thumbnailUrl),
      fetchBlobBuffer(photo.midSizeUrl),
    ])

    // Convert to WebP in parallel
    const [thumbWebp, midWebp] = await Promise.all([
      sharp(thumbBuf).webp({ quality: 80 }).toBuffer(),
      sharp(midBuf).webp({ quality: 82 }).toBuffer(),
    ])

    // Upload new WebP versions in parallel
    const [newThumb, newMid] = await Promise.all([
      put(newThumbPath, thumbWebp, { access: "private", contentType: "image/webp" }),
      put(newMidPath, midWebp, { access: "private", contentType: "image/webp" }),
    ])

    // Update DB
    await db.photo.update({
      where: { id: photo.id },
      data: { thumbnailUrl: newThumb.url, midSizeUrl: newMid.url },
    })

    // Delete old blobs
    await del([photo.thumbnailUrl, photo.midSizeUrl])

    converted++
    process.stdout.write(`\r  ${converted + failed}/${photos.length} processed (${converted} ok, ${failed} failed)`)
  } catch (err) {
    failed++
    console.error(`\n  ✗ photo ${photo.id}: ${err.message}`)
  }
}

await db.$disconnect()

console.log(`\n\nDone: ${converted} converted, ${failed} failed`)
if (failed > 0) process.exit(1)
