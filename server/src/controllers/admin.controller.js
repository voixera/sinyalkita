import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const createCustomerSchema = z.object({
  name: z.string().min(3),
  password: z.string().min(6),
  phone: z.string().min(8),
  address: z.string().min(8),
  packageId: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  monthlyAmount: z.coerce.number().int().positive().optional()
});

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
      loginId: user.loginId,
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

export async function listPackages(_req, res, next) {
  try {
    const packages = await prisma.package.findMany({
      orderBy: { monthlyPrice: "asc" }
    });

    return res.json({ packages });
  } catch (error) {
    return next(error);
  }
}

export async function createCustomer(req, res, next) {
  try {
    const payload = createCustomerSchema.parse(req.body);
    const selectedPackage = await prisma.package.findUnique({ where: { id: payload.packageId } });

    if (!selectedPackage) {
      return res.status(404).json({ message: "Paket layanan tidak ditemukan." });
    }

    const sequence = await prisma.user.count({ where: { role: "CUSTOMER" } });
    const uniqueNumber = String(sequence + 1).padStart(5, "0");
    const loginId = `${slugifyName(payload.name)}${uniqueNumber}`;
    const customerId = `SKT-${new Date().getFullYear()}-${uniqueNumber}`;
    const passwordHash = await bcrypt.hash(payload.password, 10);
    const amount = payload.monthlyAmount || selectedPackage.monthlyPrice;
    const now = new Date();
    const period = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const month = String(period.getUTCMonth() + 1).padStart(2, "0");
    const year = period.getUTCFullYear();

    const customer = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          customerId,
          loginId,
          name: payload.name,
          email: payload.email || null,
          passwordHash,
          phone: payload.phone,
          address: payload.address,
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
              invoiceNo: `INV/SKT/${year}/${month}/${uniqueNumber}`,
              period,
              amount,
              dueDate: new Date(Date.UTC(year, period.getUTCMonth(), 20)),
              status: "UNPAID"
            }
          }
        },
        include: {
          subscription: { include: { package: true } },
          billings: { orderBy: { period: "desc" }, take: 1 }
        }
      });

      return created;
    });

    return res.status(201).json({
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
    });
  } catch (error) {
    if (error?.code === "P2002") {
      return res.status(409).json({ message: "ID login, ID pelanggan, invoice, atau email sudah digunakan." });
    }
    return next(error);
  }
}

function slugifyName(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 18);
}
