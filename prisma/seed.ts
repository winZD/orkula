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

  console.log("Seed complete:");
  console.log(`  Email:    ${user.email}`);
  console.log(`  Password: password123`);
  console.log(`  Role:     ${user.role}`);
  console.log(`  Tenant:   ${tenant.name} (${tenant.slug})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
