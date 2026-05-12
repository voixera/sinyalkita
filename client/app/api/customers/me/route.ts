import { NextRequest, NextResponse } from "next/server";
import { apiError, requireAuth } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, "CUSTOMER");
    if (auth.error) return auth.error;

    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: {
        id: true,
        customerId: true,
        loginId: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        role: true,
        subscription: {
          include: { package: true }
        },
        billings: {
          orderBy: { period: "desc" },
          take: 1
        },
        payments: {
          orderBy: { paidAt: "desc" },
          take: 5,
          include: {
            billing: {
              select: { invoiceNo: true, period: true }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ message: "Pelanggan tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        customerId: user.customerId,
        loginId: user.loginId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role
      },
      subscription: user.subscription,
      currentBilling: user.billings[0],
      payments: user.payments
    });
  } catch (error) {
    return apiError(error);
  }
}
