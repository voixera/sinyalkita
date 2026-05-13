import { NextRequest, NextResponse } from "next/server";
import { apiError, requireAuth } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, "ADMIN");
    if (auth.error) return auth.error;

    const reports = await prisma.troubleReport.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        user: {
          select: { customerId: true, loginId: true, name: true, phone: true }
        }
      }
    });

    return NextResponse.json({ reports });
  } catch (error) {
    return apiError(error);
  }
}
