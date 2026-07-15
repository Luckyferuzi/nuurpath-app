CREATE TABLE "EmailCampaign" (
    "id" SERIAL NOT NULL,
    "internalName" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "audienceType" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "greetingStyle" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "preheader" TEXT,
    "body" TEXT NOT NULL,
    "highlightTitle" TEXT,
    "highlightBody" TEXT,
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "signature" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "createdByUserId" INTEGER,
    "updatedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailCampaign_status_updatedAt_idx" ON "EmailCampaign"("status", "updatedAt");
CREATE INDEX "EmailCampaign_createdByUserId_idx" ON "EmailCampaign"("createdByUserId");
CREATE INDEX "EmailCampaign_updatedByUserId_idx" ON "EmailCampaign"("updatedByUserId");

ALTER TABLE "EmailCampaign"
ADD CONSTRAINT "EmailCampaign_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EmailCampaign"
ADD CONSTRAINT "EmailCampaign_updatedByUserId_fkey"
FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
