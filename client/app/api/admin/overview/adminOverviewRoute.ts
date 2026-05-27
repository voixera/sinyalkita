import { NextRequest, NextResponse } from "next/server";
import { apiError, requireAuth } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, "ADMIN");
    if (auth.error) return auth.error;

    const start = startOfDay(startOfWeek(new Date()));
    const end = addDays(start, 7);
    const [users, pendingPayments, openReports, payments, billings, reports] = await Promise.all([
      prisma.user.findMany({
        where: { role: "CUSTOMER" },
        orderBy: { name: "asc" },
        select: {
          customerId: true,
          loginId: true,
          name: true,
          profileImage: true,
          serverName: true,
          subscription: { include: { package: true } },
          billings: { orderBy: { period: "desc" }, take: 1 }
        }
      }),
      prisma.payment.count({ where: { status: "PENDING" } }),
      prisma.troubleReport.count({ where: { status: "OPEN" } }),
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

    const customers = users.map((user) => ({
      customerId: user.customerId,
      loginId: user.loginId,
      name: user.name,
      profileImage: user.profileImage,
      serverName: user.serverName,
      packageName: user.subscription?.package.name || "-",
      serviceStatus: user.subscription?.status || "SUSPENDED",
      billingStatus: user.billings[0]?.status || "UNPAID",
      amount: user.billings[0]?.amount || 0
    }));

    const methods = Array.from(new Set(payments.map((payment) => payment.method))).sort();
    const paidByDate = new Map<string, { revenue: number; paymentsByMethod: Record<string, number> }>();
    const pendingByDate = new Map<string, number>();
    const reportsByDate = new Map<string, number>();

    payments.forEach((payment) => {
      if (payment.status !== "SUCCESS") return;
      const key = dateKey(payment.paidAt);
      const current = paidByDate.get(key) || { revenue: 0, paymentsByMethod: {} };
      current.revenue += payment.amount;
      current.paymentsByMethod[payment.method] = (current.paymentsByMethod[payment.method] || 0) + payment.amount;
      paidByDate.set(key, current);
    });

    billings.forEach((billing) => {
      const key = dateKey(billing.dueDate);
      pendingByDate.set(key, (pendingByDate.get(key) || 0) + billing.amount);
    });

    reports.forEach((report) => {
      const key = dateKey(report.createdAt);
      reportsByDate.set(key, (reportsByDate.get(key) || 0) + 1);
    });

    const operational = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(start, index);
      const key = dateKey(date);
      const dailyPaid = paidByDate.get(key);

      return {
        date: key,
        label: date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
        revenue: dailyPaid?.revenue || 0,
        pending: pendingByDate.get(key) || 0,
        reports: reportsByDate.get(key) || 0,
        paymentsByMethod: dailyPaid?.paymentsByMethod || {}
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
