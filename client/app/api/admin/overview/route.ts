import { NextRequest, NextResponse } from "next/server";
import { apiError, requireAuth } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, "ADMIN");
    if (auth.error) return auth.error;

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
      loginId: user.loginId,
      name: user.name,
      packageName: user.subscription?.package.name || "-",
      serviceStatus: user.subscription?.status || "SUSPENDED",
      billingStatus: user.billings[0]?.status || "UNPAID",
      amount: user.billings[0]?.amount || 0
    }));

    return NextResponse.json({
      customers,
      summary: {
        totalCustomers: customers.length,
        activeCustomers: customers.filter((customer) => customer.serviceStatus === "ACTIVE").length,
        unpaidBillings: customers.filter((customer) => customer.billingStatus === "UNPAID").length
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
