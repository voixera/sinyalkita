import { prisma } from "../lib/prisma.js";

export async function overview(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      where: { role: "CUSTOMER" },
      orderBy: { name: "asc" },
      include: {
        subscription: { include: { package: true } },
        billings: { orderBy: { period: "desc" }, take: 1 }
      }
    });

    const customers = users.map((user) => ({
      customerId: user.customerId,
      name: user.name,
      packageName: user.subscription?.package.name || "-",
      serviceStatus: user.subscription?.status || "SUSPENDED",
      billingStatus: user.billings[0]?.status || "UNPAID",
      amount: user.billings[0]?.amount || 0
    }));

    return res.json({ customers });
  } catch (error) {
    return next(error);
  }
}
