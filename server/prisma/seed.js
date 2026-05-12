import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordCustomer = await bcrypt.hash("pelanggan123", 10);
  const passwordAdmin = await bcrypt.hash("admin123", 10);

  const rumahStabil = await prisma.package.upsert({
    where: { id: "pkg_rumah_stabil_50" },
    update: {},
    create: {
      id: "pkg_rumah_stabil_50",
      name: "Rumah Stabil 50",
      speedMbps: 50,
      monthlyPrice: 325000,
      description: "Paket pelanggan lama untuk rumah dengan pemakaian harian stabil."
    }
  });

  const keluargaFiber = await prisma.package.upsert({
    where: { id: "pkg_keluarga_fiber_100" },
    update: {},
    create: {
      id: "pkg_keluarga_fiber_100",
      name: "Keluarga Fiber 100",
      speedMbps: 100,
      monthlyPrice: 475000,
      description: "Paket pelanggan prioritas untuk banyak perangkat."
    }
  });

  const faisal = await prisma.user.upsert({
    where: { email: "faisal@sinyalkita.test" },
    update: {},
    create: {
      customerId: "SKT-2024-00123",
      name: "Faisal Riza",
      email: "faisal@sinyalkita.test",
      passwordHash: passwordCustomer,
      phone: "0812-4400-1729",
      address: "Jl. Anggrek Raya No. 18, Bandung",
      role: "CUSTOMER",
      subscription: {
        create: {
          packageId: rumahStabil.id,
          status: "ACTIVE",
          startedAt: new Date("2019-04-12")
        }
      }
    }
  });

  await prisma.user.upsert({
    where: { email: "admin@sinyalkita.test" },
    update: {},
    create: {
      customerId: "SKT-ADMIN-00001",
      name: "Admin SinyalKita",
      email: "admin@sinyalkita.test",
      passwordHash: passwordAdmin,
      phone: "021-5088-1500",
      address: "Kantor Operasional SinyalKita",
      role: "ADMIN"
    }
  });

  const nadia = await prisma.user.upsert({
    where: { email: "nadia@sinyalkita.test" },
    update: {},
    create: {
      customerId: "SKT-2021-00884",
      name: "Nadia Prameswari",
      email: "nadia@sinyalkita.test",
      passwordHash: passwordCustomer,
      phone: "0813-9274-1180",
      address: "Jl. Melati Utara No. 5, Depok",
      role: "CUSTOMER",
      subscription: {
        create: {
          packageId: keluargaFiber.id,
          status: "ACTIVE",
          startedAt: new Date("2021-08-03")
        }
      }
    }
  });

  await createBillingSet(faisal.id, 325000, "00123");
  await createBillingSet(nadia.id, 475000, "00884", true);
}

async function createBillingSet(userId, amount, suffix, paidCurrent = false) {
  const months = [
    { period: "2026-05-01", status: paidCurrent ? "PAID" : "UNPAID" },
    { period: "2026-04-01", status: "PAID" },
    { period: "2026-03-01", status: "PAID" }
  ];

  for (const item of months) {
    const period = new Date(item.period);
    const month = String(period.getUTCMonth() + 1).padStart(2, "0");
    const year = period.getUTCFullYear();
    const billing = await prisma.billing.upsert({
      where: { invoiceNo: `INV/SKT/${year}/${month}/${suffix}` },
      update: {},
      create: {
        userId,
        invoiceNo: `INV/SKT/${year}/${month}/${suffix}`,
        period,
        amount,
        dueDate: new Date(`${year}-${month}-20`),
        status: item.status
      }
    });

    if (item.status === "PAID") {
      await prisma.payment.upsert({
        where: { reference: `SKT-PAY-${year}${month}-${suffix}` },
        update: {},
        create: {
          userId,
          billingId: billing.id,
          method: month === "03" ? "QRIS" : "Virtual Account BCA",
          amount,
          reference: `SKT-PAY-${year}${month}-${suffix}`,
          paidAt: new Date(`${year}-${month}-14T09:20:00.000Z`)
        }
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
