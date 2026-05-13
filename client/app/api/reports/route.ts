import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireAuth } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

const reportSchema = z.object({
  message: z.string().min(8).max(500)
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, "CUSTOMER");
    if (auth.error) return auth.error;

    const existingOpen = await prisma.troubleReport.findFirst({
      where: { userId: auth.user.id, status: "OPEN" }
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

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
