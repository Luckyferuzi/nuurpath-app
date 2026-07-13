ALTER TABLE "PackageBooking"
ADD COLUMN "packageTitleSnapshot" TEXT;

UPDATE "PackageBooking" AS pb
SET "packageTitleSnapshot" = p."title"
FROM "Package" AS p
WHERE pb."packageId" = p."id"
  AND pb."packageTitleSnapshot" IS NULL;

ALTER TABLE "PackageBooking"
ALTER COLUMN "packageId" DROP NOT NULL;

ALTER TABLE "PackageBooking"
DROP CONSTRAINT IF EXISTS "PackageBooking_packageId_fkey";

ALTER TABLE "PackageBooking"
ADD CONSTRAINT "PackageBooking_packageId_fkey"
FOREIGN KEY ("packageId") REFERENCES "Package"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "Review"
DROP CONSTRAINT IF EXISTS "Review_packageId_fkey";

ALTER TABLE "Review"
ADD CONSTRAINT "Review_packageId_fkey"
FOREIGN KEY ("packageId") REFERENCES "Package"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
