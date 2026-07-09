-- AlterTable
ALTER TABLE "PackageBooking"
ADD COLUMN "adminNotes" TEXT,
ADD COLUMN "lastContactedAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "FlightBooking"
ADD COLUMN "adminNotes" TEXT,
ADD COLUMN "lastContactedAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "PrivateConsultation"
ADD COLUMN "adminNotes" TEXT,
ADD COLUMN "lastContactedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ServiceInquiry"
ADD COLUMN "lastContactedAt" TIMESTAMP(3);
