import "dotenv/config";
import { hashPassword } from "../app/lib/password.server";
import { db } from "~/db/prisma";

async function main() {
  const password = await hashPassword("password123");

  const tenant = await db.tenant.create({
    data: { name: "Demo Farm", slug: "demo-farm" },
  });

  const user = await db.user.create({
    data: {
      email: "owner@orkula.dev",
      password,
      firstName: "Ivan",
      lastName: "Horvat",
      role: "OWNER",
      tenantId: tenant.id,
    },
  });

  // Groves
  const grove1 = await db.grove.create({
    data: {
      name: "Sjeverni maslinik",
      location: "Istra",
      area: 2500,
      treeCount: 120,
      tenantId: tenant.id,
    },
  });

  const grove2 = await db.grove.create({
    data: {
      name: "Južni maslinik",
      location: "Istra",
      area: 1800,
      treeCount: 85,
      tenantId: tenant.id,
    },
  });

  // Categories
  const catFertilizer = await db.category.create({
    data: { name: "Gnojivo", type: "EXPENSE", tenantId: tenant.id },
  });
  const catProtection = await db.category.create({
    data: { name: "Zaštitna sredstva", type: "EXPENSE", tenantId: tenant.id },
  });
  const catLabor = await db.category.create({
    data: { name: "Radna snaga", type: "EXPENSE", tenantId: tenant.id },
  });
  const catFuel = await db.category.create({
    data: { name: "Gorivo", type: "EXPENSE", tenantId: tenant.id },
  });
  const catOilSales = await db.category.create({
    data: { name: "Prodaja ulja", type: "INCOME", tenantId: tenant.id },
  });
  const catOliveSales = await db.category.create({
    data: { name: "Prodaja maslina", type: "INCOME", tenantId: tenant.id },
  });
  const catSubsidy = await db.category.create({
    data: { name: "Subvencije", type: "INCOME", tenantId: tenant.id },
  });

  // Transactions
  const txFertilizer = await db.transaction.create({
    data: {
      type: "EXPENSE",
      amount: 1000,
      date: new Date("2026-02-15"),
      description: "NPK 15-15-15 za proljetnu gnojidbu",
      totalQuantity: 500,
      unit: "kg",
      categoryId: catFertilizer.id,
      tenantId: tenant.id,
    },
  });

  await db.transaction.create({
    data: {
      type: "EXPENSE",
      amount: 350,
      date: new Date("2026-03-10"),
      description: "Bakreni pripravak",
      totalQuantity: 20,
      unit: "L",
      categoryId: catProtection.id,
      tenantId: tenant.id,
    },
  });

  await db.transaction.create({
    data: {
      type: "EXPENSE",
      amount: 200,
      date: new Date("2026-03-01"),
      categoryId: catFuel.id,
      tenantId: tenant.id,
    },
  });

  await db.transaction.create({
    data: {
      type: "INCOME",
      amount: 3500,
      date: new Date("2026-01-20"),
      description: "Prodaja ekstra djevičanskog ulja",
      categoryId: catOilSales.id,
      tenantId: tenant.id,
    },
  });

  await db.transaction.create({
    data: {
      type: "INCOME",
      amount: 1200,
      date: new Date("2026-02-05"),
      categoryId: catSubsidy.id,
      tenantId: tenant.id,
    },
  });

  // Grove allocations for fertilizer purchase
  await db.groveApplication.create({
    data: {
      quantity: 200,
      calculatedCost: (200 / 500) * 1000,
      transactionId: txFertilizer.id,
      groveId: grove1.id,
    },
  });

  await db.groveApplication.create({
    data: {
      quantity: 150,
      calculatedCost: (150 / 500) * 1000,
      transactionId: txFertilizer.id,
      groveId: grove2.id,
    },
  });

  console.log("Seed complete:");
  console.log(`  Email:    ${user.email}`);
  console.log(`  Password: password123`);
  console.log(`  Role:     ${user.role}`);
  console.log(`  Tenant:   ${tenant.name} (${tenant.slug})`);
  console.log(`  Groves:   ${grove1.name}, ${grove2.name}`);
  console.log(`  Categories: 7 (4 expense, 3 income)`);
  console.log(`  Transactions: 5 (3 expense, 2 income)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
