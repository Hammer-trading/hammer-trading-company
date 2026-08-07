DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChatMessageType') THEN
    CREATE TYPE "ChatMessageType" AS ENUM ('TEXT', 'IMAGE', 'VOICE', 'PRODUCT', 'SYSTEM');
  END IF;
END $$;

ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "messageType" "ChatMessageType" NOT NULL DEFAULT 'TEXT';
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "voiceDuration" INTEGER;
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "productId" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "productVariantId" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "productSnapshot" JSONB;

CREATE INDEX IF NOT EXISTS "ChatMessage_productId_idx" ON "ChatMessage"("productId");
CREATE INDEX IF NOT EXISTS "ChatMessage_productVariantId_idx" ON "ChatMessage"("productVariantId");
