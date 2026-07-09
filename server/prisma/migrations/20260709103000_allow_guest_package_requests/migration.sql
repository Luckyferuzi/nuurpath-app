-- AlterTable
ALTER TABLE "PackageBooking"
    ALTER COLUMN "userId" DROP NOT NULL,
    ALTER COLUMN "locationFrom" DROP NOT NULL,
    ALTER COLUMN "travelDate" DROP NOT NULL,
    ALTER COLUMN "passportNumber" DROP NOT NULL,
    ALTER COLUMN "dateOfBirth" DROP NOT NULL,
    ALTER COLUMN "nationality" DROP NOT NULL;
