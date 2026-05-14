const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const passwordCustomer = await bcrypt.hash("pelanggan123", 10);
  const passwordAdmin = await bcrypt.hash("admin123", 10);

  for (const name of ["Server Jombok", "Server Kepung", "Server Pare"]) {
    await prisma.serviceServer.upsert({
      where: { name },
      update: {},
      create: { name, status: "ACTIVE" }
    });
  }

  const paketWifi = await prisma.package.upsert({
    where: { id: "pkg_wifi_bulanan_65" },
    update: {
      name: "WiFi Bulanan",
      speedMbps: 20,
      monthlyPrice: 65000,
      description: "Paket pelanggan aktif SinyalKita."
    },
    create: {
      id: "pkg_wifi_bulanan_65",
      name: "WiFi Bulanan",
      speedMbps: 20,
      monthlyPrice: 65000,
      description: "Paket pelanggan aktif SinyalKita."
    }
  });

  const faisal = await prisma.user.upsert({
    where: { loginId: "faisalriza00123" },
    update: {},
    create: {
      customerId: "SKT-2024-00123",
      loginId: "faisalriza00123",
      name: "Faisal Riza",
      email: "faisal@sinyalkita.test",
      passwordHash: passwordCustomer,
      phone: "0812-4400-1729",
      address: "Jl. Anggrek Raya No. 18, Bandung",
      serverName: "Server Jombok",
      role: "CUSTOMER",
      subscription: {
        create: {
          packageId: paketWifi.id,
          status: "ACTIVE",
          startedAt: new Date("2019-04-12")
        }
      }
    }
  });

  await prisma.user.upsert({
    where: { loginId: "admin-sinyalkita" },
    update: {},
    create: {
      customerId: "SKT-ADMIN-00001",
      loginId: "admin-sinyalkita",
      name: "Admin SinyalKita",
      email: "admin@sinyalkita.test",
      passwordHash: passwordAdmin,
      phone: "021-5088-1500",
      address: "Kantor Operasional SinyalKita",
      role: "ADMIN"
    }
  });

  await createBillingSet(faisal.id, 65000, "00123");
}

async function createBillingSet(userId, amount, suffix) {
  const months = [
    { period: "2026-05-01", status: "UNPAID" },
    { period: "2026-04-01", status: "PAID" }
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
          method: "Virtual Account BCA",
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
