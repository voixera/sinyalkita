import { prisma } from "@/lib/server/prisma";

export const ACTIVE_REPORT_STATUSES = ["OPEN", "ACCEPTED"] as const;

let acceptedReportStatusReady = false;

export async function ensureAcceptedReportStatus() {
  if (acceptedReportStatusReady) return;

  await prisma.$executeRawUnsafe(`ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED'`);
  acceptedReportStatusReady = true;
}
