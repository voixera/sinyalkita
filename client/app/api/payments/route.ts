import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireAuth } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

const paySchema = z.object({
  billingId: z.string().min(1),
  method: z.enum(["Transfer BNI", "Transfer BCA", "QRIS", "Transfer Manual"]),
  proofImage: z.string().min(20).max(2_500_000),
  proofName: z.string().min(1).max(120)
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

    const existingPending = await prisma.payment.findFirst({
      where: {
        billingId: billing.id,
        userId: auth.user.id,
        status: "PENDING"
      }
    });

    if (existingPending) {
      return NextResponse.json({ message: "Pembayaran tagihan ini sedang menunggu verifikasi admin." }, { status: 409 });
    }

    const payment = await prisma.payment.create({
      data: {
        userId: auth.user.id,
        billingId: billing.id,
        amount: billing.amount,
        method: payload.method,
        status: "PENDING",
        reference: `SKT-PAY-${Date.now()}`,
        proofImage: payload.proofImage,
        proofName: payload.proofName,
        proofUploadedAt: new Date()
      },
      include: {
        billing: { select: { invoiceNo: true, period: true } }
      }
    });

    return NextResponse.json({ payment, billing }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
