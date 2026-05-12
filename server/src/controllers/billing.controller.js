import { prisma } from "../lib/prisma.js";

export async function listBillings(req, res, next) {
  try {
    const billings = await prisma.billing.findMany({
      where: { userId: req.user.id },
      orderBy: { period: "desc" }
    });
    return res.json({ billings });
  } catch (error) {
    return next(error);
  }
}
