import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireAuth } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

const verifySchema = z.object({
  action: z.enum(["approve", "reject"])
});

export async function PATCH(req: NextRequest, { params }: { params: { paymentId: string } }) {
  try {
    const auth = await requireAuth(req, "ADMIN");
    if (auth.error) return auth.error;

    const payload = verifySchema.parse(await req.json());
    const payment = await prisma.payment.findUnique({
      where: { id: params.paymentId },
      include: { billing: true }
    });

    if (!payment) {
      return NextResponse.json({ message: "Pembayaran tidak ditemukan." }, { status: 404 });
    }

    if (payment.status !== "PENDING") {
      return NextResponse.json({ message: "Pembayaran ini sudah diverifikasi." }, { status: 409 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextStatus = payload.action === "approve" ? "SUCCESS" : "FAILED";
      const verified = await tx.payment.update({
        where: { id: payment.id },
        data: { status: nextStatus },
        include: {
          billing: { select: { invoiceNo: true, period: true } }
        }
      });

      if (payload.action === "approve") {
        await tx.billing.update({
          where: { id: payment.billingId },
          data: { status: "PAID" }
        });
      }

      return verified;
    });

    return NextResponse.json({ payment: updated });
  } catch (error) {
    return apiError(error);
  }
}
