import { prisma } from "../lib/prisma.js";

export async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
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

    return res.json({
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
    return next(error);
  }
}
