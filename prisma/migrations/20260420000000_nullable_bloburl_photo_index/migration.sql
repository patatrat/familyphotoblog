-- Make blobUrl nullable (originals are no longer stored for new uploads)
ALTER TABLE "Photo" ALTER COLUMN "blobUrl" DROP NOT NULL;

-- Index to speed up event page queries filtered by status
CREATE INDEX "Photo_eventId_status_idx" ON "Photo"("eventId", "status");
