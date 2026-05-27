#!/usr/bin/env node
/**
 * Incremental Vercel Blob → S3 backup.
 *
 * Reads all blobs from the Vercel store, compares against existing S3 objects,
 * and uploads only the ones that aren't backed up yet.
 *
 * Required env vars:
 *   BLOB_READ_WRITE_TOKEN  - Vercel Blob token
 *   BACKUP_S3_BUCKET       - S3 bucket name
 *   AWS_ACCESS_KEY_ID      - AWS credentials
 *   AWS_SECRET_ACCESS_KEY  - AWS credentials
 *   AWS_DEFAULT_REGION     - AWS region (e.g. ap-southeast-2)
 */

import { list } from "@vercel/blob";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

const bucket = process.env.BACKUP_S3_BUCKET;
const region = process.env.AWS_DEFAULT_REGION ?? "ap-southeast-2";
const token = process.env.BLOB_READ_WRITE_TOKEN;
const S3_PREFIX = "blobs/";

if (!bucket || !token) {
  console.error("Missing required env vars: BACKUP_S3_BUCKET, BLOB_READ_WRITE_TOKEN");
  process.exit(1);
}

const s3 = new S3Client({ region });

async function listS3Keys() {
  const keys = new Set();
  let continuationToken;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: S3_PREFIX,
        ContinuationToken: continuationToken,
      })
    );
    for (const obj of res.Contents ?? []) keys.add(obj.Key);
    continuationToken = res.NextContinuationToken;
  } while (continuationToken);
  return keys;
}

async function listAllBlobs() {
  const blobs = [];
  let cursor;
  do {
    const result = await list({ cursor, limit: 1000, token });
    blobs.push(...result.blobs);
    cursor = result.cursor;
  } while (cursor);
  return blobs;
}

async function main() {
  console.log("Listing existing S3 backups…");
  const existingKeys = await listS3Keys();
  console.log(`  ${existingKeys.size} objects already in S3`);

  console.log("Listing Vercel blobs…");
  const blobs = await listAllBlobs();
  console.log(`  ${blobs.length} blobs in Vercel store`);

  const toBackup = blobs.filter(
    (b) => !existingKeys.has(`${S3_PREFIX}${b.pathname}`)
  );
  const alreadyBacked = blobs.length - toBackup.length;
  console.log(`  ${alreadyBacked} already backed up, ${toBackup.length} to upload\n`);

  let success = 0;
  let failed = 0;

  for (const blob of toBackup) {
    const s3Key = `${S3_PREFIX}${blob.pathname}`;
    let lastErr;
    let uploaded = false;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(blob.url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} from Vercel`);

        const body = Buffer.from(await res.arrayBuffer());

        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: s3Key,
            Body: body,
            ContentType: blob.contentType ?? "application/octet-stream",
            StorageClass: "STANDARD_IA",
            Metadata: {
              "vercel-url": blob.url,
              "blob-size": String(blob.size),
              "blob-uploaded-at": blob.uploadedAt?.toISOString() ?? "",
            },
          })
        );
        console.log(`  ✓ ${blob.pathname}`);
        success++;
        uploaded = true;
        break;
      } catch (err) {
        lastErr = err;
        if (attempt < 3) {
          console.warn(`  ↻ ${blob.pathname}: ${err.message} (retry ${attempt}/3)`);
          await new Promise((r) => setTimeout(r, attempt * 2000));
        }
      }
    }

    if (!uploaded) {
      console.error(`  ✗ ${blob.pathname}: ${lastErr.message}`);
      failed++;
    }
  }

  console.log(
    `\nDone: ${success} uploaded, ${failed} failed, ${alreadyBacked} already in S3`
  );
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
