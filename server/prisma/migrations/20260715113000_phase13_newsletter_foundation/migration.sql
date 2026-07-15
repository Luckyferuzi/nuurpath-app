ALTER TABLE "NewsletterSubscriber"
ADD COLUMN "name" TEXT;

CREATE TABLE "EmailSuppression" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSuppression_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailSuppression_email_key" ON "EmailSuppression"("email");
