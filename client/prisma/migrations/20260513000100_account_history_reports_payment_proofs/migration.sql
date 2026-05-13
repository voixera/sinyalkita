CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED');

ALTER TABLE "Payment"
ADD COLUMN "proofImage" TEXT,
ADD COLUMN "proofName" TEXT,
ADD COLUMN "proofUploadedAt" TIMESTAMP(3);

CREATE TABLE "GeneratedAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "loginId" TEXT NOT NULL,
  "passwordPlain" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "GeneratedAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TroubleReport" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),

  CONSTRAINT "TroubleReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GeneratedAccount_userId_key" ON "GeneratedAccount"("userId");
CREATE INDEX "GeneratedAccount_createdAt_idx" ON "GeneratedAccount"("createdAt");
CREATE INDEX "TroubleReport_userId_status_idx" ON "TroubleReport"("userId", "status");
CREATE INDEX "TroubleReport_createdAt_idx" ON "TroubleReport"("createdAt");

ALTER TABLE "GeneratedAccount"
ADD CONSTRAINT "GeneratedAccount_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TroubleReport"
ADD CONSTRAINT "TroubleReport_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
