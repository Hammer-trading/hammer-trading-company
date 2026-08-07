ALTER TABLE "ChatMessage"
ADD COLUMN IF NOT EXISTS "replyToId" TEXT,
ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ChatMessage_conversationId_isPinned_idx"
ON "ChatMessage"("conversationId", "isPinned");

CREATE INDEX IF NOT EXISTS "ChatMessage_replyToId_idx"
ON "ChatMessage"("replyToId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ChatMessage_replyToId_fkey'
  ) THEN
    ALTER TABLE "ChatMessage"
    ADD CONSTRAINT "ChatMessage_replyToId_fkey"
    FOREIGN KEY ("replyToId") REFERENCES "ChatMessage"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
