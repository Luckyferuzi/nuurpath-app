ALTER TABLE "PackageBooking"
ADD COLUMN "assignedAt" TIMESTAMP(3),
ADD COLUMN "assignedStaffId" INTEGER,
ADD COLUMN "lastStatusChangedAt" TIMESTAMP(3),
ADD COLUMN "lastUpdatedByUserId" INTEGER;

ALTER TABLE "FlightBooking"
ADD COLUMN "assignedAt" TIMESTAMP(3),
ADD COLUMN "assignedStaffId" INTEGER,
ADD COLUMN "lastStatusChangedAt" TIMESTAMP(3),
ADD COLUMN "lastUpdatedByUserId" INTEGER;

ALTER TABLE "PrivateConsultation"
ADD COLUMN "assignedAt" TIMESTAMP(3),
ADD COLUMN "assignedStaffId" INTEGER,
ADD COLUMN "lastStatusChangedAt" TIMESTAMP(3),
ADD COLUMN "lastUpdatedByUserId" INTEGER;

ALTER TABLE "ServiceInquiry"
ADD COLUMN "assignedAt" TIMESTAMP(3),
ADD COLUMN "assignedStaffId" INTEGER,
ADD COLUMN "lastStatusChangedAt" TIMESTAMP(3),
ADD COLUMN "lastUpdatedByUserId" INTEGER;

ALTER TABLE "PackageBooking"
ADD CONSTRAINT "PackageBooking_assignedStaffId_fkey"
FOREIGN KEY ("assignedStaffId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "PackageBooking"
ADD CONSTRAINT "PackageBooking_lastUpdatedByUserId_fkey"
FOREIGN KEY ("lastUpdatedByUserId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "FlightBooking"
ADD CONSTRAINT "FlightBooking_assignedStaffId_fkey"
FOREIGN KEY ("assignedStaffId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "FlightBooking"
ADD CONSTRAINT "FlightBooking_lastUpdatedByUserId_fkey"
FOREIGN KEY ("lastUpdatedByUserId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "PrivateConsultation"
ADD CONSTRAINT "PrivateConsultation_assignedStaffId_fkey"
FOREIGN KEY ("assignedStaffId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "PrivateConsultation"
ADD CONSTRAINT "PrivateConsultation_lastUpdatedByUserId_fkey"
FOREIGN KEY ("lastUpdatedByUserId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "ServiceInquiry"
ADD CONSTRAINT "ServiceInquiry_assignedStaffId_fkey"
FOREIGN KEY ("assignedStaffId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "ServiceInquiry"
ADD CONSTRAINT "ServiceInquiry_lastUpdatedByUserId_fkey"
FOREIGN KEY ("lastUpdatedByUserId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "PackageBooking_assignedStaffId_idx" ON "PackageBooking"("assignedStaffId");
CREATE INDEX "FlightBooking_assignedStaffId_idx" ON "FlightBooking"("assignedStaffId");
CREATE INDEX "PrivateConsultation_assignedStaffId_idx" ON "PrivateConsultation"("assignedStaffId");
CREATE INDEX "ServiceInquiry_assignedStaffId_idx" ON "ServiceInquiry"("assignedStaffId");

UPDATE "PackageBooking"
SET "lastStatusChangedAt" = COALESCE("lastContactedAt", "updatedAt", "createdAt")
WHERE "lastStatusChangedAt" IS NULL;

UPDATE "FlightBooking"
SET "lastStatusChangedAt" = COALESCE("lastContactedAt", "updatedAt", "createdAt")
WHERE "lastStatusChangedAt" IS NULL;

UPDATE "PrivateConsultation"
SET "lastStatusChangedAt" = COALESCE("lastContactedAt", "updatedAt", "createdAt")
WHERE "lastStatusChangedAt" IS NULL;

UPDATE "ServiceInquiry"
SET "lastStatusChangedAt" = COALESCE("lastContactedAt", "updatedAt", "createdAt")
WHERE "lastStatusChangedAt" IS NULL;
