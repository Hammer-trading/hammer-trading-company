-- Additive operations upgrade. Legacy room-service and quote records remain intact.

ALTER TABLE "ProductVariant"
  ADD COLUMN "wholesalePrice" DECIMAL(12,2),
  ADD COLUMN "minWholesaleQuantity" INTEGER;

ALTER TABLE "Order"
  ADD COLUMN "serviceCharge" DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "QuoteRequest"
  ADD COLUMN "quotedSubtotal" DECIMAL(12,2),
  ADD COLUMN "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "deliveryCharge" DECIMAL(12,2),
  ADD COLUMN "quotedTotal" DECIMAL(12,2),
  ADD COLUMN "validUntil" TIMESTAMP(3),
  ADD COLUMN "terms" TEXT;

ALTER TABLE "ProductPackage"
  ADD COLUMN "legacyRoomPackageId" TEXT,
  ADD COLUMN "legacyItems" JSONB,
  ADD COLUMN "migrationStatus" TEXT;

ALTER TABLE "ServiceBooking"
  ADD COLUMN "packageId" TEXT,
  ADD COLUMN "packageSnapshot" JSONB,
  ADD COLUMN "materialSubtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "serviceCharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "quotedTotal" DECIMAL(12,2),
  ADD COLUMN "convertedOrderId" TEXT,
  ADD COLUMN "legacyRoomServiceRequestId" TEXT;

ALTER TABLE "ProjectProduct"
  ADD COLUMN "variantId" TEXT,
  ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "note" TEXT,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ProjectMedia"
  ADD COLUMN "mediaAssetId" TEXT,
  ADD COLUMN "caption" TEXT,
  ADD COLUMN "posterUrl" TEXT;

CREATE TABLE "QuoteRequestItem" (
  "id" TEXT NOT NULL,
  "quoteRequestId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "name" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "variantTitle" TEXT,
  "variantOptions" JSONB,
  "quantity" INTEGER NOT NULL,
  "requestedTargetPrice" DECIMAL(12,2),
  "quotedUnitPrice" DECIMAL(12,2),
  "costPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "lineTotal" DECIMAL(12,2),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuoteRequestItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceBookingItem" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "name" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "variantTitle" TEXT,
  "variantOptions" JSONB,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "costPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceBookingItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OutboundNotificationJob" (
  "id" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "provider" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attemptsCount" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 4,
  "lastError" TEXT,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OutboundNotificationJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OutboundNotificationAttempt" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "provider" TEXT,
  "error" TEXT,
  "providerResponse" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutboundNotificationAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductPackage_legacyRoomPackageId_key" ON "ProductPackage"("legacyRoomPackageId");
CREATE UNIQUE INDEX "ServiceBooking_convertedOrderId_key" ON "ServiceBooking"("convertedOrderId");
CREATE UNIQUE INDEX "ServiceBooking_legacyRoomServiceRequestId_key" ON "ServiceBooking"("legacyRoomServiceRequestId");
CREATE INDEX "ServiceBooking_packageId_idx" ON "ServiceBooking"("packageId");
CREATE INDEX "ServiceBooking_convertedOrderId_idx" ON "ServiceBooking"("convertedOrderId");
CREATE INDEX "QuoteRequest_status_createdAt_idx" ON "QuoteRequest"("status", "createdAt");
CREATE INDEX "QuoteRequest_customerPhone_idx" ON "QuoteRequest"("customerPhone");
CREATE INDEX "QuoteRequestItem_quoteRequestId_sortOrder_idx" ON "QuoteRequestItem"("quoteRequestId", "sortOrder");
CREATE INDEX "QuoteRequestItem_productId_idx" ON "QuoteRequestItem"("productId");
CREATE INDEX "QuoteRequestItem_variantId_idx" ON "QuoteRequestItem"("variantId");
CREATE INDEX "ServiceBookingItem_bookingId_sortOrder_idx" ON "ServiceBookingItem"("bookingId", "sortOrder");
CREATE INDEX "ServiceBookingItem_productId_idx" ON "ServiceBookingItem"("productId");
CREATE INDEX "ServiceBookingItem_variantId_idx" ON "ServiceBookingItem"("variantId");
CREATE INDEX "ProjectProduct_variantId_idx" ON "ProjectProduct"("variantId");
CREATE INDEX "ProjectMedia_mediaAssetId_idx" ON "ProjectMedia"("mediaAssetId");
CREATE INDEX "OutboundNotificationJob_status_nextAttemptAt_idx" ON "OutboundNotificationJob"("status", "nextAttemptAt");
CREATE INDEX "OutboundNotificationJob_channel_createdAt_idx" ON "OutboundNotificationJob"("channel", "createdAt");
CREATE INDEX "OutboundNotificationJob_recipient_idx" ON "OutboundNotificationJob"("recipient");
CREATE INDEX "OutboundNotificationAttempt_jobId_createdAt_idx" ON "OutboundNotificationAttempt"("jobId", "createdAt");

DROP INDEX IF EXISTS "ProjectProduct_projectId_productId_key";
CREATE UNIQUE INDEX "ProjectProduct_projectId_productId_variantId_key"
  ON "ProjectProduct"("projectId", "productId", "variantId");

ALTER TABLE "ProductPackage"
  ADD CONSTRAINT "ProductPackage_legacyRoomPackageId_fkey"
  FOREIGN KEY ("legacyRoomPackageId") REFERENCES "RoomPackage"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ServiceBooking"
  ADD CONSTRAINT "ServiceBooking_packageId_fkey"
  FOREIGN KEY ("packageId") REFERENCES "ProductPackage"("id")
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ServiceBooking_convertedOrderId_fkey"
  FOREIGN KEY ("convertedOrderId") REFERENCES "Order"("id")
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ServiceBooking_legacyRoomServiceRequestId_fkey"
  FOREIGN KEY ("legacyRoomServiceRequestId") REFERENCES "RoomServiceRequest"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "QuoteRequestItem"
  ADD CONSTRAINT "QuoteRequestItem_quoteRequestId_fkey"
  FOREIGN KEY ("quoteRequestId") REFERENCES "QuoteRequest"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "QuoteRequestItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "QuoteRequestItem_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ServiceBookingItem"
  ADD CONSTRAINT "ServiceBookingItem_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "ServiceBooking"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ServiceBookingItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ServiceBookingItem_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectProduct"
  ADD CONSTRAINT "ProjectProduct_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectMedia"
  ADD CONSTRAINT "ProjectMedia_mediaAssetId_fkey"
  FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OutboundNotificationAttempt"
  ADD CONSTRAINT "OutboundNotificationAttempt_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "OutboundNotificationJob"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill each existing single-product RFQ into its new line-item representation.
INSERT INTO "QuoteRequestItem" (
  "id", "quoteRequestId", "productId", "name", "sku", "quantity",
  "quotedUnitPrice", "costPrice", "lineTotal", "sortOrder", "createdAt", "updatedAt"
)
SELECT
  'legacy-' || q."id",
  q."id",
  q."productId",
  q."productName",
  p."sku",
  q."quantity",
  CASE WHEN q."quotedPrice" IS NOT NULL AND q."quantity" > 0
    THEN q."quotedPrice" / q."quantity" ELSE NULL END,
  p."costPrice",
  q."quotedPrice",
  0,
  q."createdAt",
  q."updatedAt"
FROM "QuoteRequest" q
JOIN "Product" p ON p."id" = q."productId"
WHERE q."productId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "QuoteRequestItem" i WHERE i."quoteRequestId" = q."id"
  );
