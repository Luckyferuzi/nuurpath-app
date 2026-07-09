-- CreateTable
CREATE TABLE "ServiceInquiry" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "serviceId" INTEGER,
    "serviceType" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "country" TEXT,
    "preferredDate" TIMESTAMP(3),
    "applicants" INTEGER,
    "urgency" TEXT,
    "documentStatus" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'New',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceInquiry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ServiceInquiry"
ADD CONSTRAINT "ServiceInquiry_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceInquiry"
ADD CONSTRAINT "ServiceInquiry_serviceId_fkey"
FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
