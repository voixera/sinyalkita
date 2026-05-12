import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireAuth } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

const paySchema = z.object({
  billingId: z.string().min(1),
  method: z.enum(["Virtual Account BCA", "QRIS", "Transfer Manual"])
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, "CUSTOMER");
    if (auth.error) return auth.error;

    const payments = await prisma.payment.findMany({
      where: { userId: auth.user.id },
      orderBy: { paidAt: "desc" },
      include: {
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

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, "CUSTOMER");
    if (auth.error) return auth.error;

    const payload = paySchema.parse(await req.json());
    const billing = await prisma.billing.findFirst({
      where: { id: payload.billingId, userId: auth.user.id }
    });

    if (!billing) {
      return NextResponse.json({ message: "Tagihan tidak ditemukan." }, { status: 404 });
    }

    if (billing.status === "PAID") {
      return NextResponse.json({ message: "Tagihan ini sudah lunas." }, { status: 409 });
    }

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          userId: auth.user.id,
          billingId: billing.id,
          amount: billing.amount,
          method: payload.method,
          reference: `SKT-PAY-${Date.now()}`
        },
        include: {
          billing: { select: { invoiceNo: true, period: true } }
        }
      });

      await tx.billing.update({
        where: { id: billing.id },
        data: { status: "PAID" }
      });

      return created;
    });

    return NextResponse.json({ payment, billing: { ...billing, status: "PAID" } }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
