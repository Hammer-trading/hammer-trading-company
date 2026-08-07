ALTER TABLE "CartItem"
ADD COLUMN "packageId" TEXT,
ADD COLUMN "packageName" TEXT;

CREATE INDEX "CartItem_packageId_idx" ON "CartItem"("packageId");

ALTER TABLE "CartItem"
ADD CONSTRAINT "CartItem_packageId_fkey"
FOREIGN KEY ("packageId") REFERENCES "ProductPackage"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
