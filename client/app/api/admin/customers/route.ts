import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireAuth } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

const createCustomerSchema = z.object({
  name: z.string().min(3),
  password: z.string().min(6),
  phone: z.string().min(8),
  address: z.string().min(8),
  serverName: z.enum(["Server Jombok", "Server Kepung", "Server Pare"]).default("Server Jombok"),
  packageId: z.string().optional(),
  email: z.string().email().optional().or(z.literal(""))
});

const serverPrices: Record<string, number> = {
  "Server Jombok": 65000,
  "Server Kepung": 100000,
  "Server Pare": 65000
};

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, "ADMIN");
    if (auth.error) return auth.error;

    const payload = createCustomerSchema.parse(await req.json());
    const selectedPackage = await prisma.package.findUnique({ where: { id: payload.packageId || "pkg_wifi_bulanan_65" } });

    if (!selectedPackage) {
      return NextResponse.json({ message: "Paket layanan tidak ditemukan." }, { status: 404 });
    }

    const baseNumber = await prisma.user.count({ where: { role: "CUSTOMER" } });
    const identity = await createUniqueIdentity(payload.name, baseNumber);
    const passwordHash = await bcrypt.hash(payload.password, 10);
    const amount = serverPrices[payload.serverName] || selectedPackage.monthlyPrice;
    const now = new Date();
    const firstBilling = getFirstBillingSchedule(now);
    const period = firstBilling.period;
    const month = String(period.getUTCMonth() + 1).padStart(2, "0");
    const year = period.getUTCFullYear();

    const customer = await prisma.$transaction(async (tx) => {
      return tx.user.create({
        data: {
          customerId: identity.customerId,
          loginId: identity.loginId,
          name: payload.name,
          email: payload.email || null,
          passwordHash,
          phone: payload.phone,
          address: payload.address,
          serverName: payload.serverName,
          role: "CUSTOMER",
          subscription: {
            create: {
              packageId: selectedPackage.id,
              status: "ACTIVE",
              startedAt: now
            }
          },
          billings: {
            create: {
              invoiceNo: `INV/SKT/${year}/${month}/${identity.uniqueNumber}`,
              period,
              amount,
              dueDate: firstBilling.dueDate,
              status: "UNPAID"
            }
          },
          generatedAccount: {
            create: {
              loginId: identity.loginId,
              passwordPlain: payload.password,
              customerName: payload.name,
              customerId: identity.customerId
            }
          }
        },
        include: {
          subscription: { include: { package: true } },
          billings: { orderBy: { period: "desc" }, take: 1 }
        }
      });
    });

    return NextResponse.json(
      {
        customer: {
          customerId: customer.customerId,
          loginId: customer.loginId,
          name: customer.name,
          packageName: customer.subscription?.package.name || "-",
          serviceStatus: customer.subscription?.status || "ACTIVE",
          billingStatus: customer.billings[0]?.status || "UNPAID",
          amount: customer.billings[0]?.amount || amount
        },
        credentials: {
          loginId: customer.loginId,
          password: payload.password
        }
      },
      { status: 201 }
    );
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ message: "ID login, ID user, invoice, atau email sudah digunakan." }, { status: 409 });
    }
    return apiError(error);
  }
}

function slugifyName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 18);
}

function getFirstBillingSchedule(startedAt: Date) {
  return {
    period: new Date(Date.UTC(startedAt.getUTCFullYear(), startedAt.getUTCMonth() + 1, 1)),
    dueDate: new Date(Date.UTC(startedAt.getUTCFullYear(), startedAt.getUTCMonth() + 1, startedAt.getUTCDate()))
  };
}

async function createUniqueIdentity(name: string, baseNumber: number) {
  const year = new Date().getFullYear();
  const baseSlug = slugifyName(name) || "user";

  for (let offset = 1; offset <= 100; offset += 1) {
    const uniqueNumber = String(baseNumber + offset).padStart(5, "0");
    const loginId = `${baseSlug}${uniqueNumber}`;
    const customerId = `SKT-${year}-${uniqueNumber}`;
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ loginId }, { customerId }]
      },
      select: { id: true }
    });

    if (!existing) {
      return { uniqueNumber, loginId, customerId };
    }
  }

  throw new Error("Nomor unik user belum dapat dibuat. Coba lagi.");
}
