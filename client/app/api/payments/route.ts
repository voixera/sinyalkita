import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireAuth } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

const paySchema = z.object({
  billingIds: z.array(z.string().min(1)).min(1).max(12),
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
    const billingIds = Array.from(new Set(payload.billingIds));
    const billings = await prisma.billing.findMany({
      where: {
        id: { in: billingIds },
        userId: auth.user.id
      },
      orderBy: { period: "asc" }
    });

    if (billings.length !== billingIds.length) {
      return NextResponse.json({ message: "Sebagian tagihan tidak ditemukan." }, { status: 404 });
    }

    if (billings.some((billing) => billing.status === "PAID")) {
      return NextResponse.json({ message: "Sebagian tagihan yang dipilih sudah lunas." }, { status: 409 });
    }

    const existingPending = await prisma.payment.findMany({
      where: {
        billingId: { in: billingIds },
        userId: auth.user.id,
        status: "PENDING"
      }
    });

    if (existingPending.length > 0) {
      return NextResponse.json({ message: "Sebagian tagihan sedang menunggu verifikasi admin." }, { status: 409 });
    }

    const now = Date.now();
    const payments = await prisma.$transaction(
      billings.map((billing, index) =>
        prisma.payment.create({
          data: {
            userId: auth.user.id,
            billingId: billing.id,
            amount: billing.amount,
            method: payload.method,
            status: "PENDING",
            reference: `SKT-PAY-${now}-${index + 1}`,
            proofImage: payload.proofImage,
            proofName: payload.proofName,
            proofUploadedAt: new Date()
          },
          include: {
            billing: { select: { invoiceNo: true, period: true } }
          }
        })
      )
    );

    return NextResponse.json({ payments, billings }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
