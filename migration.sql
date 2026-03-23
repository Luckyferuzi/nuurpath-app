-- AlterTable
ALTER TABLE "PackageBooking" ADD COLUMN "locationFrom" TEXT;
ALTER TABLE "PackageBooking" ADD COLUMN "passportNumber" TEXT;
ALTER TABLE "PackageBooking" ADD COLUMN "passportExpiryDate" TIMESTAMP(3);
ALTER TABLE "PackageBooking" ADD COLUMN "dateOfBirth" TIMESTAMP(3);
ALTER TABLE "PackageBooking" ADD COLUMN "nationality" TEXT;
ALTER TABLE "PackageBooking" ADD COLUMN "specialRequests" TEXT;
ALTER TABLE "PackageBooking" ADD COLUMN "passportCopy" TEXT;
ALTER TABLE "Service" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
ALTER TABLE "User" ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "verificationToken" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordResetToken" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordResetExpires" TIMESTAMP(3);