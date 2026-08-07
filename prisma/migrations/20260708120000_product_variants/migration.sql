-- Add product variant support while keeping existing products, carts, and orders compatible.
CREATE TABLE IF NOT EXISTS "ProductVariant" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "barcode" TEXT,
  "price" DECIMAL(12,2) NOT NULL,
  "compareAtPrice" DECIMAL(12,2),
  "costPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
  "imageUrl" TEXT,
  "options" JSONB NOT NULL DEFAULT '{}',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductVariant_sku_key" ON "ProductVariant"("sku");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductVariant_barcode_key" ON "ProductVariant"("barcode");
CREATE INDEX IF NOT EXISTS "ProductVariant_productId_idx" ON "ProductVariant"("productId");
CREATE INDEX IF NOT EXISTS "ProductVariant_isActive_idx" ON "ProductVariant"("isActive");
CREATE INDEX IF NOT EXISTS "ProductVariant_stock_idx" ON "ProductVariant"("stock");

ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "variantId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "variantId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "variantTitle" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "variantOptions" JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'CartItem_variantId_fkey'
  ) THEN
    ALTER TABLE "CartItem"
      ADD CONSTRAINT "CartItem_variantId_fkey"
      FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'OrderItem_variantId_fkey'
  ) THEN
    ALTER TABLE "OrderItem"
      ADD CONSTRAINT "OrderItem_variantId_fkey"
      FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "CartItem_variantId_idx" ON "CartItem"("variantId");
CREATE INDEX IF NOT EXISTS "OrderItem_variantId_idx" ON "OrderItem"("variantId");

INSERT INTO "ProductVariant" (
  "id",
  "productId",
  "title",
  "sku",
  "barcode",
  "price",
  "compareAtPrice",
  "costPrice",
  "stock",
  "lowStockThreshold",
  "imageUrl",
  "options",
  "isDefault",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  'variant_' || p."id",
  p."id",
  'Default',
  p."sku" || '-DEFAULT',
  NULL,
  p."price",
  p."compareAtPrice",
  p."costPrice",
  p."stock",
  p."lowStockThreshold",
  (
    SELECT pi."url"
    FROM "ProductImage" pi
    WHERE pi."productId" = p."id"
    ORDER BY pi."isMain" DESC, pi."sortOrder" ASC
    LIMIT 1
  ),
  '{}'::jsonb,
  true,
  p."isActive",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Product" p
WHERE NOT EXISTS (
  SELECT 1 FROM "ProductVariant" pv WHERE pv."productId" = p."id"
);
