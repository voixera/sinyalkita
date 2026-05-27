import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireAuth } from "@/lib/server/auth";
import { sendAdminReportNotificationEmail } from "@/lib/server/mail";
import { prisma } from "@/lib/server/prisma";
import { ACTIVE_REPORT_STATUSES, ensureAcceptedReportStatus } from "@/lib/server/report-status";

export const dynamic = "force-dynamic";

const reportSchema = z.object({
  message: z.string().min(8).max(500)
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, "CUSTOMER");
    if (auth.error) return auth.error;

    await ensureAcceptedReportStatus();

    const existingOpen = await prisma.troubleReport.findFirst({
      where: { userId: auth.user.id, status: { in: [...ACTIVE_REPORT_STATUSES] } }
    });

    if (existingOpen) {
      return NextResponse.json({ message: "Laporan sebelumnya masih ditangani admin." }, { status: 409 });
    }

    const payload = reportSchema.parse(await req.json());
    const report = await prisma.troubleReport.create({
      data: {
        userId: auth.user.id,
        message: payload.message,
        status: "OPEN"
      }
    });

    try {
      const openReportCount = await prisma.troubleReport.count({ where: { status: "OPEN" } });
      await sendAdminReportNotificationEmail({
        count: openReportCount,
        userName: auth.user.name,
        detail: payload.message,
        createdAt: report.createdAt
      });
    } catch (error) {
      console.error("Admin report notification email failed", error);
    }

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
