ALTER TABLE "ProductPackage"
  ADD COLUMN IF NOT EXISTS "roomType" TEXT NOT NULL DEFAULT 'Complete room',
  ADD COLUMN IF NOT EXISTS "tier" TEXT NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN IF NOT EXISTS "coverageSummary" TEXT,
  ADD COLUMN IF NOT EXISTS "customizationNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "deliveryInformation" TEXT,
  ADD COLUMN IF NOT EXISTS "installationIncluded" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "HomeService"
  ADD COLUMN IF NOT EXISTS "serviceMode" TEXT NOT NULL DEFAULT 'PRODUCT_INSTALLATION',
  ADD COLUMN IF NOT EXISTS "siteVisitRequired" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "siteVisitFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "laborPricingNote" TEXT;

ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "progressPercent" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "isCustomerNamePublic" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "testimonial" TEXT;

CREATE TABLE IF NOT EXISTS "ProjectUpdate" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "progressPercent" INTEGER,
  "milestone" TEXT,
  "media" JSONB NOT NULL DEFAULT '[]',
  "isPublic" BOOLEAN NOT NULL DEFAULT true,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectUpdate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProjectUpdate_projectId_isPublic_occurredAt_idx"
  ON "ProjectUpdate"("projectId", "isPublic", "occurredAt");
CREATE INDEX IF NOT EXISTS "ProjectUpdate_projectId_sortOrder_idx"
  ON "ProjectUpdate"("projectId", "sortOrder");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProjectUpdate_projectId_fkey'
  ) THEN
    ALTER TABLE "ProjectUpdate"
      ADD CONSTRAINT "ProjectUpdate_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "AboutPage" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL DEFAULT 'about',
  "eyebrow" TEXT NOT NULL DEFAULT 'Hammer Trading Company',
  "heroTitle" TEXT NOT NULL DEFAULT 'Built for the work that matters',
  "heroSubtitle" TEXT NOT NULL DEFAULT '',
  "heroImage" TEXT,
  "heroVideo" TEXT,
  "introTitle" TEXT NOT NULL DEFAULT 'Hardware, service and field experience',
  "introBody" TEXT NOT NULL DEFAULT '',
  "mission" TEXT NOT NULL DEFAULT '',
  "vision" TEXT NOT NULL DEFAULT '',
  "values" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "serviceAreas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "stats" JSONB NOT NULL DEFAULT '[]',
  "milestones" JSONB NOT NULL DEFAULT '[]',
  "gallery" JSONB NOT NULL DEFAULT '[]',
  "ctaTitle" TEXT,
  "ctaText" TEXT,
  "ctaLabel" TEXT,
  "ctaHref" TEXT,
  "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AboutPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AboutPage_slug_key" ON "AboutPage"("slug");
CREATE INDEX IF NOT EXISTS "AboutPage_status_updatedAt_idx" ON "AboutPage"("status", "updatedAt");
