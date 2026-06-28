ALTER TABLE "Budget"
ADD COLUMN "frequency" TEXT NOT NULL DEFAULT 'monthly',
ADD COLUMN "periodEnd" TEXT,
ADD COLUMN "periodStart" TEXT;
