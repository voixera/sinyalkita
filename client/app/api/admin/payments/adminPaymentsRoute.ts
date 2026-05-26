import { NextRequest, NextResponse } from "next/server";
import { apiError, requireAuth } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, "ADMIN");
    if (auth.error) return auth.error;

    const payments = await prisma.payment.findMany({
      where: { status: "PENDING" },
      orderBy: { paidAt: "asc" },
      include: {
        user: {
          select: { customerId: true, name: true, loginId: true }
        },
        billing: {
          select: { invoiceNo: true, period: true }
        }
      }
    });

    return NextResponse.json({ payments });
  } catch (error) {
    return apiError(error);
  }
}
