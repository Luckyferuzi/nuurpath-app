-- Add new package structure fields
ALTER TABLE "Package"
ADD COLUMN "displayOrder" INTEGER,
ADD COLUMN "journeyStops" JSONB;

-- Backfill display order based on creation sequence so existing packages
-- keep a predictable default order until staff manually rearrange them.
WITH ordered_packages AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS row_number
    FROM "Package"
)
UPDATE "Package" AS package_row
SET "displayOrder" = ordered_packages.row_number
FROM ordered_packages
WHERE package_row."id" = ordered_packages."id";

ALTER TABLE "Package"
ALTER COLUMN "displayOrder" SET NOT NULL,
ALTER COLUMN "displayOrder" SET DEFAULT 0;

CREATE INDEX "Package_displayOrder_idx" ON "Package"("displayOrder");
CREATE INDEX "Package_isFeatured_featuredOrder_idx" ON "Package"("isFeatured", "featuredOrder");
