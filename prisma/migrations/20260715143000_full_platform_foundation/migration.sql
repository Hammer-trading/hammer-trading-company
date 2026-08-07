-- Additive production platform foundation. Existing commerce tables and data are preserved.
ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'PACKAGES_MANAGE';
ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'SERVICES_MANAGE';
ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'PROJECTS_MANAGE';
ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'MEDIA_MANAGE';
ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'CONTENT_MANAGE';
ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'SEO_MANAGE';
ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'SECURITY_MANAGE';

CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "ServiceBookingStatus" AS ENUM ('NEW', 'CONTACTED', 'INSPECTION_REQUIRED', 'QUOTATION_SENT', 'APPROVED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ProjectStatus" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED', 'ON_HOLD', 'CANCELLED');
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO', 'PDF', 'DOCUMENT');
CREATE TYPE "ConversationStatus" AS ENUM ('NEW', 'OPEN', 'PENDING', 'RESOLVED', 'CLOSED');

ALTER TABLE "User"
  ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "profileImage" TEXT,
  ADD COLUMN "lastLoginAt" TIMESTAMP(3);

ALTER TABLE "ChatConversation"
  ADD COLUMN "status" "ConversationStatus" NOT NULL DEFAULT 'NEW',
  ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isBlocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "internalNotes" TEXT,
  ADD COLUMN "lastCustomerMessageAt" TIMESTAMP(3),
  ADD COLUMN "lastAdminMessageAt" TIMESTAMP(3);

ALTER TABLE "ChatMessage"
  ADD COLUMN "attachmentUrl" TEXT,
  ADD COLUMN "attachmentName" TEXT,
  ADD COLUMN "attachmentType" TEXT,
  ADD COLUMN "deliveredAt" TIMESTAMP(3),
  ADD COLUMN "readAt" TIMESTAMP(3);

ALTER TABLE "OrderItem"
  ADD COLUMN "packageId" TEXT,
  ADD COLUMN "packageName" TEXT,
  ADD COLUMN "packageSku" TEXT;

CREATE TABLE "UserSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenId" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailChangeToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "oldEmail" TEXT NOT NULL,
  "newEmail" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailChangeToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaAsset" (
  "id" TEXT NOT NULL,
  "kind" "MediaKind" NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "mimeType" TEXT,
  "sizeBytes" INTEGER,
  "altText" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "uploadedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PackageCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "image" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PackageCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "image" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HomeService" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "categoryId" TEXT,
  "shortDescription" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL,
  "startingPrice" DECIMAL(12,2),
  "fixedPrice" DECIMAL(12,2),
  "requestQuoteEnabled" BOOLEAN NOT NULL DEFAULT true,
  "bookingEnabled" BOOLEAN NOT NULL DEFAULT true,
  "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true,
  "coverImage" TEXT,
  "gallery" JSONB NOT NULL DEFAULT '[]',
  "beforeAfter" JSONB NOT NULL DEFAULT '[]',
  "videos" JSONB NOT NULL DEFAULT '[]',
  "estimatedCompletionTime" TEXT,
  "availableDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "availableTimeSlots" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "cities" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "warrantyInformation" TEXT,
  "includedWork" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "excludedWork" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "requiredMaterials" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "showOnHomepage" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "imageAlt" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HomeService_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductPackage" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "categoryId" TEXT,
  "coverImage" TEXT,
  "gallery" JSONB NOT NULL DEFAULT '[]',
  "shortDescription" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL,
  "originalPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "fixedDiscount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "percentageDiscount" INTEGER NOT NULL DEFAULT 0,
  "finalPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "badge" TEXT,
  "installationServiceId" TEXT,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "showOnHomepage" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "imageAlt" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductPackage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PackageItem" (
  "id" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "PackageItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceProduct" (
  "id" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ServiceProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceBooking" (
  "id" TEXT NOT NULL,
  "requestNumber" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "userId" TEXT,
  "customerName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "address" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "area" TEXT,
  "preferredDate" TIMESTAMP(3),
  "preferredTime" TEXT,
  "projectDetails" TEXT,
  "attachments" JSONB NOT NULL DEFAULT '[]',
  "customerNote" TEXT,
  "internalNote" TEXT,
  "quotationAmount" DECIMAL(12,2),
  "status" "ServiceBookingStatus" NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceBooking_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Project" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "categoryId" TEXT,
  "serviceId" TEXT,
  "customerOrCompany" TEXT,
  "location" TEXT,
  "shortDescription" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL,
  "startDate" TIMESTAMP(3),
  "expectedCompletionDate" TIMESTAMP(3),
  "actualCompletionDate" TIMESTAMP(3),
  "projectStatus" "ProjectStatus" NOT NULL DEFAULT 'UPCOMING',
  "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "showOnHomepage" BOOLEAN NOT NULL DEFAULT false,
  "coverImage" TEXT,
  "videos" JSONB NOT NULL DEFAULT '[]',
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "imageAlt" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectProduct" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  CONSTRAINT "ProjectProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectMedia" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'GALLERY',
  "url" TEXT NOT NULL,
  "altText" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectMedia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NavigationItem" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "location" TEXT NOT NULL DEFAULT 'HEADER',
  "icon" TEXT,
  "parentId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "desktopVisible" BOOLEAN NOT NULL DEFAULT true,
  "mobileVisible" BOOLEAN NOT NULL DEFAULT true,
  "openInNewTab" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NavigationItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HomepageSection" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "heading" TEXT NOT NULL,
  "subtitle" TEXT,
  "description" TEXT,
  "backgroundImage" TEXT,
  "backgroundVideo" TEXT,
  "buttonText" TEXT,
  "buttonLink" TEXT,
  "layout" TEXT NOT NULL DEFAULT 'DEFAULT',
  "configuration" JSONB NOT NULL DEFAULT '{}',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "desktopVisible" BOOLEAN NOT NULL DEFAULT true,
  "mobileVisible" BOOLEAN NOT NULL DEFAULT true,
  "animationEnabled" BOOLEAN NOT NULL DEFAULT true,
  "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HomepageSection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserSession_tokenId_key" ON "UserSession"("tokenId");
CREATE INDEX "UserSession_userId_revokedAt_idx" ON "UserSession"("userId", "revokedAt");
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");
CREATE UNIQUE INDEX "EmailChangeToken_tokenHash_key" ON "EmailChangeToken"("tokenHash");
CREATE INDEX "EmailChangeToken_userId_usedAt_idx" ON "EmailChangeToken"("userId", "usedAt");
CREATE INDEX "EmailChangeToken_expiresAt_idx" ON "EmailChangeToken"("expiresAt");
CREATE UNIQUE INDEX "MediaAsset_url_key" ON "MediaAsset"("url");
CREATE INDEX "MediaAsset_kind_createdAt_idx" ON "MediaAsset"("kind", "createdAt");
CREATE INDEX "MediaAsset_uploadedById_idx" ON "MediaAsset"("uploadedById");
CREATE UNIQUE INDEX "PackageCategory_slug_key" ON "PackageCategory"("slug");
CREATE INDEX "PackageCategory_isActive_sortOrder_idx" ON "PackageCategory"("isActive", "sortOrder");
CREATE UNIQUE INDEX "ServiceCategory_slug_key" ON "ServiceCategory"("slug");
CREATE INDEX "ServiceCategory_isActive_sortOrder_idx" ON "ServiceCategory"("isActive", "sortOrder");
CREATE UNIQUE INDEX "ProjectCategory_slug_key" ON "ProjectCategory"("slug");
CREATE UNIQUE INDEX "HomeService_slug_key" ON "HomeService"("slug");
CREATE INDEX "HomeService_categoryId_idx" ON "HomeService"("categoryId");
CREATE INDEX "HomeService_status_isActive_sortOrder_idx" ON "HomeService"("status", "isActive", "sortOrder");
CREATE INDEX "HomeService_showOnHomepage_isFeatured_idx" ON "HomeService"("showOnHomepage", "isFeatured");
CREATE UNIQUE INDEX "ProductPackage_slug_key" ON "ProductPackage"("slug");
CREATE UNIQUE INDEX "ProductPackage_sku_key" ON "ProductPackage"("sku");
CREATE INDEX "ProductPackage_categoryId_idx" ON "ProductPackage"("categoryId");
CREATE INDEX "ProductPackage_status_isActive_sortOrder_idx" ON "ProductPackage"("status", "isActive", "sortOrder");
CREATE INDEX "ProductPackage_showOnHomepage_isFeatured_idx" ON "ProductPackage"("showOnHomepage", "isFeatured");
CREATE UNIQUE INDEX "PackageItem_packageId_productId_variantId_key" ON "PackageItem"("packageId", "productId", "variantId");
CREATE INDEX "PackageItem_productId_idx" ON "PackageItem"("productId");
CREATE INDEX "PackageItem_variantId_idx" ON "PackageItem"("variantId");
CREATE INDEX "OrderItem_packageId_idx" ON "OrderItem"("packageId");
CREATE UNIQUE INDEX "ServiceProduct_serviceId_productId_key" ON "ServiceProduct"("serviceId", "productId");
CREATE INDEX "ServiceProduct_productId_idx" ON "ServiceProduct"("productId");
CREATE UNIQUE INDEX "ServiceBooking_requestNumber_key" ON "ServiceBooking"("requestNumber");
CREATE INDEX "ServiceBooking_serviceId_status_idx" ON "ServiceBooking"("serviceId", "status");
CREATE INDEX "ServiceBooking_userId_createdAt_idx" ON "ServiceBooking"("userId", "createdAt");
CREATE INDEX "ServiceBooking_city_status_idx" ON "ServiceBooking"("city", "status");
CREATE INDEX "ServiceBooking_phone_idx" ON "ServiceBooking"("phone");
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
CREATE INDEX "Project_categoryId_projectStatus_idx" ON "Project"("categoryId", "projectStatus");
CREATE INDEX "Project_serviceId_idx" ON "Project"("serviceId");
CREATE INDEX "Project_status_showOnHomepage_sortOrder_idx" ON "Project"("status", "showOnHomepage", "sortOrder");
CREATE UNIQUE INDEX "ProjectProduct_projectId_productId_key" ON "ProjectProduct"("projectId", "productId");
CREATE INDEX "ProjectProduct_productId_idx" ON "ProjectProduct"("productId");
CREATE INDEX "ProjectMedia_projectId_type_sortOrder_idx" ON "ProjectMedia"("projectId", "type", "sortOrder");
CREATE INDEX "NavigationItem_location_isActive_sortOrder_idx" ON "NavigationItem"("location", "isActive", "sortOrder");
CREATE INDEX "NavigationItem_parentId_idx" ON "NavigationItem"("parentId");
CREATE UNIQUE INDEX "HomepageSection_key_key" ON "HomepageSection"("key");
CREATE INDEX "HomepageSection_status_isActive_sortOrder_idx" ON "HomepageSection"("status", "isActive", "sortOrder");
CREATE INDEX "ChatConversation_status_lastMessageAt_idx" ON "ChatConversation"("status", "lastMessageAt");
CREATE INDEX "ChatConversation_isPinned_isArchived_idx" ON "ChatConversation"("isPinned", "isArchived");

ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailChangeToken" ADD CONSTRAINT "EmailChangeToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HomeService" ADD CONSTRAINT "HomeService_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductPackage" ADD CONSTRAINT "ProductPackage_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PackageCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductPackage" ADD CONSTRAINT "ProductPackage_installationServiceId_fkey" FOREIGN KEY ("installationServiceId") REFERENCES "HomeService"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PackageItem" ADD CONSTRAINT "PackageItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ProductPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PackageItem" ADD CONSTRAINT "PackageItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PackageItem" ADD CONSTRAINT "PackageItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ProductPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceProduct" ADD CONSTRAINT "ServiceProduct_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "HomeService"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceProduct" ADD CONSTRAINT "ServiceProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "HomeService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProjectCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "HomeService"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectProduct" ADD CONSTRAINT "ProjectProduct_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectProduct" ADD CONSTRAINT "ProjectProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectMedia" ADD CONSTRAINT "ProjectMedia_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NavigationItem" ADD CONSTRAINT "NavigationItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "NavigationItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
