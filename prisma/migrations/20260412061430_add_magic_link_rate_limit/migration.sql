-- CreateTable
CREATE TABLE "MagicLinkRequest" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLinkRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MagicLinkRequest_identifier_createdAt_idx" ON "MagicLinkRequest"("identifier", "createdAt");
