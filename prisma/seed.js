import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
const prisma = new PrismaClient();
async function main() {
  // Clear existing data

  await prisma.userTable.deleteMany();
  console.log("Existing users cleared!");

  // Generate 10 users
  console.log("Creating users...");
  for (let i = 0; i < 10; i++) {
    await prisma.userTable.create({
      data: {
        name: `User-${i + 1}`,
        contact: `+1-800-${Math.floor(1000000 + Math.random() * 9000000)}`, // Random 7-digit phone number
        email: `user${i + 1}@example.com`,
        password: `password${i + 1}`, // Simple password for demonstration
      },
    });
    console.log("user " + i + " created");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    console.log("10 users created...");
    await prisma.$disconnect();
  });
