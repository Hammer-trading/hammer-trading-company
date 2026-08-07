-- CreateTable
CREATE TABLE "RoomPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "roomType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT,
    "items" JSONB NOT NULL DEFAULT '[]',
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "compareAtPrice" DECIMAL(12,2),
    "durationDays" INTEGER NOT NULL DEFAULT 1,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomServiceRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "packageId" TEXT,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "roomType" TEXT NOT NULL,
    "roomSize" TEXT,
    "preferredDate" TIMESTAMP(3),
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "estimatedTotal" DECIMAL(12,2),
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomPackage_slug_key" ON "RoomPackage"("slug");

-- CreateIndex
CREATE INDEX "RoomPackage_isActive_sortOrder_idx" ON "RoomPackage"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "RoomPackage_isFeatured_idx" ON "RoomPackage"("isFeatured");

-- CreateIndex
CREATE UNIQUE INDEX "RoomServiceRequest_requestNumber_key" ON "RoomServiceRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "RoomServiceRequest_status_createdAt_idx" ON "RoomServiceRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RoomServiceRequest_phone_idx" ON "RoomServiceRequest"("phone");

-- CreateIndex
CREATE INDEX "RoomServiceRequest_packageId_idx" ON "RoomServiceRequest"("packageId");

-- AddForeignKey
ALTER TABLE "RoomServiceRequest" ADD CONSTRAINT "RoomServiceRequest_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "RoomPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
