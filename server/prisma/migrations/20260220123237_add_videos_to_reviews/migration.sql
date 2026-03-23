-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_packageId_fkey";

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "bookingId" INTEGER;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "images" TEXT[],
ADD COLUMN     "isVisible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "videos" TEXT[],
ALTER COLUMN "packageId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;
