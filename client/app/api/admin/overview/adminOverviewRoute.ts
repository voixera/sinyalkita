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
      select: {
        id: true,
        customerId: true,
        loginId: true,
        name: true,
        subscription: { include: { package: true } },
        billings: { orderBy: { period: "desc" }, take: 1 }
      }
    });
    const profileImages = await readProfileImages(users.map((user) => user.id));

    const customers = users.map((user) => ({
      customerId: user.customerId,
      loginId: user.loginId,
      name: user.name,
      profileImage: profileImages.get(user.id) || null,
      packageName: user.subscription?.package.name || "-",
      serviceStatus: user.subscription?.status || "SUSPENDED",
      billingStatus: user.billings[0]?.status || "UNPAID",
      amount: user.billings[0]?.amount || 0
    }));
    const pendingPayments = await prisma.payment.count({ where: { status: "PENDING" } });
    const openReports = await prisma.troubleReport.count({ where: { status: "OPEN" } });
    const start = startOfDay(startOfWeek(new Date()));
    const end = addDays(start, 7);
    const [payments, billings, reports] = await Promise.all([
      prisma.payment.findMany({
        where: { paidAt: { gte: start, lt: end } },
        select: { amount: true, method: true, paidAt: true, status: true }
      }),
      prisma.billing.findMany({
        where: { dueDate: { gte: start, lt: end }, status: { in: ["UNPAID", "OVERDUE"] } },
        select: { amount: true, dueDate: true }
      }),
      prisma.troubleReport.findMany({
        where: { createdAt: { gte: start, lt: end } },
        select: { createdAt: true }
      })
    ]);

    const methods = Array.from(new Set(payments.map((payment) => payment.method))).sort();
    const operational = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(start, index);
      const key = dateKey(date);
      const dailyPayments = payments.filter((payment) => dateKey(payment.paidAt) === key && payment.status === "SUCCESS");
      const paymentsByMethod = dailyPayments.reduce<Record<string, number>>((acc, payment) => {
        acc[payment.method] = (acc[payment.method] || 0) + payment.amount;
        return acc;
      }, {});

      return {
        date: key,
        label: date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
        revenue: dailyPayments.reduce((total, payment) => total + payment.amount, 0),
        pending: billings.filter((billing) => dateKey(billing.dueDate) === key).reduce((total, billing) => total + billing.amount, 0),
        reports: reports.filter((report) => dateKey(report.createdAt) === key).length,
        paymentsByMethod
      };
    });

    return NextResponse.json({
      customers,
      operational: {
        rangeLabel: `${formatShortDate(start)} - ${formatShortDate(addDays(start, 6))}`,
        methods,
        points: operational
      },
      summary: {
        totalCustomers: customers.length,
        activeCustomers: customers.filter((customer) => customer.serviceStatus === "ACTIVE").length,
        unpaidBillings: customers.filter((customer) => customer.billingStatus === "UNPAID").length,
        pendingPayments,
        openReports
      }
    });
  } catch (error) {
    return apiError(error);
  }
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + mondayOffset);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

async function readProfileImages(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string | null>();

  try {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, profileImage: true }
    });

    return new Map(users.map((user) => [user.id, user.profileImage || null]));
  } catch (error) {
    if (isMissingProfileImageStorage(error)) return new Map<string, string | null>();
    throw error;
  }
}

function isMissingProfileImageStorage(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  return code === "P2022" || (message.includes("profileImage") && message.includes("column"));
}
