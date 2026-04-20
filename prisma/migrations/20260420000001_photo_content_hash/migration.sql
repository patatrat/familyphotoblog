-- Add content hash for duplicate detection within an event
ALTER TABLE "Photo" ADD COLUMN "hash" TEXT;

-- NULLs are distinct in PostgreSQL UNIQUE, so existing photos with NULL hash won't conflict
CREATE UNIQUE INDEX "Photo_eventId_hash_key" ON "Photo"("eventId", "hash");
