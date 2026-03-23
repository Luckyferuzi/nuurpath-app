/*
  Warnings:

  - You are about to drop the column `cabinClass` on the `FlightBooking` table. All the data in the column will be lost.
  - Added the required column `contactEmail` to the `FlightBooking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contactName` to the `FlightBooking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contactPhone` to the `FlightBooking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `travelClass` to the `FlightBooking` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "FlightBooking" DROP CONSTRAINT "FlightBooking_userId_fkey";

-- AlterTable
ALTER TABLE "FlightBooking" DROP COLUMN "cabinClass",
ADD COLUMN     "contactEmail" TEXT NOT NULL,
ADD COLUMN     "contactName" TEXT NOT NULL,
ADD COLUMN     "contactPhone" TEXT NOT NULL,
ADD COLUMN     "passengers" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "travelClass" TEXT NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "FlightBooking" ADD CONSTRAINT "FlightBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
