-- CreateEnum
CREATE TYPE "EmailVerificationPurpose" AS ENUM ('PROFILE_EMAIL_CHANGE', 'CUSTOMER_EMAIL_LINK');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "profileImage" TEXT;

-- CreateTable
CREATE TABLE "EmailVerificationCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "targetEmail" TEXT NOT NULL,
    "currentEmail" TEXT,
    "codeHash" TEXT NOT NULL,
    "purpose" "EmailVerificationPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailVerificationCode_pkey" PRIMARY KEY ("id")
);

-- UpdateData
UPDATE "User"
SET "email" = 'rizafaisal130@gmail.com'
WHERE "loginId" = 'admin-sinyalkita';

-- CreateIndex
CREATE INDEX "EmailVerificationCode_userId_purpose_createdAt_idx" ON "EmailVerificationCode"("userId", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "EmailVerificationCode_targetEmail_purpose_createdAt_idx" ON "EmailVerificationCode"("targetEmail", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "EmailVerificationCode_expiresAt_idx" ON "EmailVerificationCode"("expiresAt");

-- AddForeignKey
ALTER TABLE "EmailVerificationCode" ADD CONSTRAINT "EmailVerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
