ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "customerPublicId" TEXT;

UPDATE "User"
SET "customerPublicId" = 'HTC-CUS-' || upper(substr(md5("id"), 1, 10))
WHERE "role" = 'CUSTOMER' AND "customerPublicId" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_customerPublicId_key" ON "User"("customerPublicId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChatSenderRole') THEN
    CREATE TYPE "ChatSenderRole" AS ENUM ('CUSTOMER', 'ADMIN');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ChatConversation" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "adminId" TEXT,
  "lastMessage" TEXT,
  "lastMessageAt" TIMESTAMP(3),
  "customerUnreadCount" INTEGER NOT NULL DEFAULT 0,
  "adminUnreadCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ChatMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderId" TEXT,
  "senderRole" "ChatSenderRole" NOT NULL,
  "messageText" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChatConversation_customerId_key" ON "ChatConversation"("customerId");
CREATE INDEX IF NOT EXISTS "ChatConversation_lastMessageAt_idx" ON "ChatConversation"("lastMessageAt");
CREATE INDEX IF NOT EXISTS "ChatConversation_adminUnreadCount_idx" ON "ChatConversation"("adminUnreadCount");
CREATE INDEX IF NOT EXISTS "ChatConversation_customerUnreadCount_idx" ON "ChatConversation"("customerUnreadCount");
CREATE INDEX IF NOT EXISTS "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "ChatMessage_senderId_idx" ON "ChatMessage"("senderId");
CREATE INDEX IF NOT EXISTS "ChatMessage_senderRole_isRead_idx" ON "ChatMessage"("senderRole", "isRead");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChatConversation_customerId_fkey'
  ) THEN
    ALTER TABLE "ChatConversation"
    ADD CONSTRAINT "ChatConversation_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChatConversation_adminId_fkey'
  ) THEN
    ALTER TABLE "ChatConversation"
    ADD CONSTRAINT "ChatConversation_adminId_fkey"
    FOREIGN KEY ("adminId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChatMessage_conversationId_fkey'
  ) THEN
    ALTER TABLE "ChatMessage"
    ADD CONSTRAINT "ChatMessage_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChatMessage_senderId_fkey'
  ) THEN
    ALTER TABLE "ChatMessage"
    ADD CONSTRAINT "ChatMessage_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
