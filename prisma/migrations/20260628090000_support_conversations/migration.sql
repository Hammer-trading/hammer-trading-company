ALTER TABLE "SupportTicket"
ADD COLUMN IF NOT EXISTS "customerPublicId" TEXT,
ADD COLUMN IF NOT EXISTS "customerName" TEXT,
ADD COLUMN IF NOT EXISTS "customerPhone" TEXT,
ADD COLUMN IF NOT EXISTS "customerEmail" TEXT,
ADD COLUMN IF NOT EXISTS "unreadByAdmin" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "unreadByCustomer" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "SupportMessage" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "senderType" TEXT NOT NULL,
  "senderName" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "attachmentUrl" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SupportMessage_ticketId_fkey'
  ) THEN
    ALTER TABLE "SupportMessage"
    ADD CONSTRAINT "SupportMessage_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "SupportTicket_customerPublicId_idx" ON "SupportTicket"("customerPublicId");
CREATE INDEX IF NOT EXISTS "SupportTicket_lastMessageAt_idx" ON "SupportTicket"("lastMessageAt");
CREATE INDEX IF NOT EXISTS "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId", "createdAt");
