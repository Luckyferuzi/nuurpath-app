ALTER TABLE "NewsletterSubscriber"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "unsubscribedAt" TIMESTAMP(3);

CREATE TABLE "MediaPost" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "destination" TEXT,
    "eventDate" TIMESTAMP(3),
    "videoUrl" TEXT,
    "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "relatedPackageId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaPost_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MediaPost"
ADD CONSTRAINT "MediaPost_relatedPackageId_fkey"
FOREIGN KEY ("relatedPackageId")
REFERENCES "Package"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "MediaPost_displayOrder_idx" ON "MediaPost"("displayOrder");
CREATE INDEX "MediaPost_isPublished_displayOrder_idx" ON "MediaPost"("isPublished", "displayOrder");
