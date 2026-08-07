ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "receiverId" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "clientMessageId" TEXT;

UPDATE "ChatConversation"
SET "adminId" = (
  SELECT "id"
  FROM "User"
  WHERE "isActive" = true
    AND "role" IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT_STAFF')
  ORDER BY CASE WHEN "role" = 'SUPER_ADMIN' THEN 0 WHEN "role" = 'ADMIN' THEN 1 ELSE 2 END, "createdAt" ASC
  LIMIT 1
)
WHERE "adminId" IS NULL;

UPDATE "ChatMessage" AS message
SET "receiverId" = CASE
  WHEN message."senderRole" = 'CUSTOMER' THEN conversation."adminId"
  ELSE conversation."customerId"
END
FROM "ChatConversation" AS conversation
WHERE message."conversationId" = conversation."id"
  AND message."receiverId" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "ChatConversation_customerId_key" ON "ChatConversation"("customerId");
CREATE UNIQUE INDEX IF NOT EXISTS "ChatMessage_clientMessageId_key" ON "ChatMessage"("clientMessageId");
CREATE INDEX IF NOT EXISTS "ChatMessage_receiverId_idx" ON "ChatMessage"("receiverId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChatMessage_receiverId_fkey') THEN
    ALTER TABLE "ChatMessage"
    ADD CONSTRAINT "ChatMessage_receiverId_fkey"
    FOREIGN KEY ("receiverId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
