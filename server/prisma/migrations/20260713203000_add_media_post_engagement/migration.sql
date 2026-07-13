CREATE TABLE "MediaPostComment" (
    "id" SERIAL NOT NULL,
    "mediaPostId" INTEGER NOT NULL,
    "userId" INTEGER,
    "authorName" TEXT NOT NULL,
    "authorLocation" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaPostComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaPostInteraction" (
    "id" SERIAL NOT NULL,
    "mediaPostId" INTEGER NOT NULL,
    "userId" INTEGER,
    "type" TEXT NOT NULL,
    "visitorKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaPostInteraction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MediaPostComment_mediaPostId_createdAt_idx" ON "MediaPostComment"("mediaPostId", "createdAt");
CREATE INDEX "MediaPostComment_userId_idx" ON "MediaPostComment"("userId");
CREATE INDEX "MediaPostInteraction_mediaPostId_createdAt_idx" ON "MediaPostInteraction"("mediaPostId", "createdAt");
CREATE INDEX "MediaPostInteraction_userId_idx" ON "MediaPostInteraction"("userId");
CREATE INDEX "MediaPostInteraction_type_idx" ON "MediaPostInteraction"("type");

CREATE UNIQUE INDEX "MediaPostInteraction_mediaPostId_type_visitorKey_key" ON "MediaPostInteraction"("mediaPostId", "type", "visitorKey");

ALTER TABLE "MediaPostComment"
ADD CONSTRAINT "MediaPostComment_mediaPostId_fkey"
FOREIGN KEY ("mediaPostId") REFERENCES "MediaPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MediaPostComment"
ADD CONSTRAINT "MediaPostComment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MediaPostInteraction"
ADD CONSTRAINT "MediaPostInteraction_mediaPostId_fkey"
FOREIGN KEY ("mediaPostId") REFERENCES "MediaPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MediaPostInteraction"
ADD CONSTRAINT "MediaPostInteraction_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
