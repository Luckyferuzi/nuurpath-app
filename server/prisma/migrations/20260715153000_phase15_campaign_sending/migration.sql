ALTER TABLE "EmailCampaign"
ADD COLUMN "recipientCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "sentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "failedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastSentAt" TIMESTAMP(3),
ADD COLUMN "lastTestSentAt" TIMESTAMP(3),
ADD COLUMN "lastError" TEXT;

CREATE TABLE "EmailCampaignRecipient" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "source" TEXT NOT NULL,
    "deliveryType" TEXT NOT NULL DEFAULT 'LIVE',
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailCampaignRecipient_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailCampaignRecipient_campaignId_createdAt_idx" ON "EmailCampaignRecipient"("campaignId", "createdAt");
CREATE INDEX "EmailCampaignRecipient_campaignId_deliveryType_status_idx" ON "EmailCampaignRecipient"("campaignId", "deliveryType", "status");
CREATE INDEX "EmailCampaignRecipient_email_idx" ON "EmailCampaignRecipient"("email");

ALTER TABLE "EmailCampaignRecipient"
ADD CONSTRAINT "EmailCampaignRecipient_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "EmailCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
