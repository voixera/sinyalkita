import { NextRequest, NextResponse } from "next/server";
import { apiError, requireAuth } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, "ADMIN");
    if (auth.error) return auth.error;

    const [pendingPayments, openReports] = await Promise.all([
      prisma.payment.count({ where: { status: "PENDING" } }),
      prisma.troubleReport.count({ where: { status: "OPEN" } })
    ]);

    return NextResponse.json({
      summary: {
        pendingPayments,
        openReports
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
