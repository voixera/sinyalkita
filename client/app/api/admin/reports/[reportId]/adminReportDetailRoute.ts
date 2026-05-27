import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireAuth } from "@/lib/server/auth";
import { sendReportCheckingEmail, sendReportFixedEmail } from "@/lib/server/mail";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  status: z.enum(["ACCEPTED", "RESOLVED"])
});

let acceptedReportStatusReady = false;

export async function PATCH(req: NextRequest, { params }: { params: { reportId: string } }) {
  try {
    const auth = await requireAuth(req, "ADMIN");
    if (auth.error) return auth.error;

    const payload = updateSchema.parse(await req.json());
    if (payload.status === "ACCEPTED") {
      await ensureAcceptedReportStatus();
    }

    const report = await prisma.troubleReport.update({
      where: { id: params.reportId },
      data: {
        status: payload.status,
        resolvedAt: payload.status === "RESOLVED" ? new Date() : null
      },
      include: {
        user: { select: { name: true, email: true } }
      }
    });

    if (report.user.email) {
      try {
        const sendEmail = payload.status === "ACCEPTED" ? sendReportCheckingEmail : sendReportFixedEmail;
        await sendEmail({
          to: report.user.email,
          name: report.user.name,
          message: report.message
        });
      } catch (error) {
        console.error("Report status email failed", error);
      }
    }

    return NextResponse.json({ report });
  } catch (error) {
    return apiError(error);
  }
}

async function ensureAcceptedReportStatus() {
  if (acceptedReportStatusReady) return;

  await prisma.$executeRawUnsafe(`ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED'`);
  acceptedReportStatusReady = true;
}
