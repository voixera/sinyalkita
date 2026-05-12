import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const paySchema = z.object({
  billingId: z.string().min(1),
  method: z.enum(["Virtual Account BCA", "QRIS", "Transfer Manual"])
});

export async function listPayments(req, res, next) {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user.id },
      orderBy: { paidAt: "desc" },
      include: {
        billing: {
          select: { invoiceNo: true, period: true }
        }
      }
    });
    return res.json({ payments });
  } catch (error) {
    return next(error);
  }
}

export async function createPayment(req, res, next) {
  try {
    const payload = paySchema.parse(req.body);
    const billing = await prisma.billing.findFirst({
      where: { id: payload.billingId, userId: req.user.id }
    });

    if (!billing) {
      return res.status(404).json({ message: "Tagihan tidak ditemukan." });
    }

    if (billing.status === "PAID") {
      return res.status(409).json({ message: "Tagihan ini sudah lunas." });
    }

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          userId: req.user.id,
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

    return res.status(201).json({
      payment,
      billing: { ...billing, status: "PAID" }
    });
  } catch (error) {
    return next(error);
  }
}
