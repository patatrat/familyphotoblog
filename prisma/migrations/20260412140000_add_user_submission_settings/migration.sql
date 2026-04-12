-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN "userEventsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SiteSettings" ADD COLUMN "userPhotosEnabled" BOOLEAN NOT NULL DEFAULT false;
