import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireAuth } from "@/lib/server/auth";
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
      }
    });

    return NextResponse.json({ report });
  } catch (error) {
    return apiError(error);
  }
}
