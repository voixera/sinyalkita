import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireAuth } from "@/lib/server/auth";
import { sendReportCheckingEmail } from "@/lib/server/mail";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  status: z.literal("RESOLVED")
});

export async function PATCH(req: NextRequest, { params }: { params: { reportId: string } }) {
  try {
    const auth = await requireAuth(req, "ADMIN");
    if (auth.error) return auth.error;

    updateSchema.parse(await req.json());

    const report = await prisma.troubleReport.update({
      where: { id: params.reportId },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date()
      },
      include: {
        user: { select: { name: true, email: true } }
      }
    });

    if (report.user.email) {
      try {
        await sendReportCheckingEmail({
          to: report.user.email,
          name: report.user.name,
          message: report.message
        });
      } catch (error) {
        console.error("Report checking email failed", error);
      }
    }

    return NextResponse.json({ report });
  } catch (error) {
    return apiError(error);
  }
}
