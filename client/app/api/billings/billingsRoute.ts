import { NextRequest, NextResponse } from "next/server";
import { apiError, requireAuth } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, "CUSTOMER");
    if (auth.error) return auth.error;

    const billings = await prisma.billing.findMany({
      where: {
        userId: auth.user.id,
        status: { not: "PAID" },
        payments: {
          none: { status: "PENDING" }
        }
      },
      orderBy: { period: "desc" }
    });

    return NextResponse.json({ billings });
  } catch (error) {
    return apiError(error);
  }
}
