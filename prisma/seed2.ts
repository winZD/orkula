import "dotenv/config";
import { db } from "~/db/prisma";

const OLIVE_VARIETIES = [
  "OBLICA",
  "LEVANTINKA",
  "LASTOVKA",
  "BUZA",
  "DROBNICA",
  "LECCINO",
  "FRANTOIO",
  "PENDOLINO",
  "CORATINA",
  "ARBEQUINA",
  "PICUAL",
  "KORONEIKI",
  "OTHER",
] as const;

const HARVEST_METHODS = [
  "HAND",
  "RAKE",
  "MECHANICAL_SHAKER",
  "VIBRATOR",
  "NET",
] as const;

const LOCATIONS = [
  "Istria",
  "Dalmatia",
  "Kvarner",
  "Zadar County",
  "Split County",
  "Dubrovnik County",
  "Šibenik County",
  "Korčula",
  "Hvar",
  "Brač",
  "Vis",
  "Pag",
  "Ugljan",
  "Cres",
  "Lošinj",
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[rand(0, arr.length - 1)];
}

function randomDate(yearFrom: number, yearTo: number) {
  const start = new Date(yearFrom, 0, 1).getTime();
  const end = new Date(yearTo, 11, 31).getTime();
  return new Date(start + Math.random() * (end - start));
}

async function main() {
  const tenant = await db.tenant.findFirst();
  if (!tenant) {
    console.error("No tenant found. Run the main seed first.");
    process.exit(1);
  }

  const user = await db.user.findFirst({ where: { tenantId: tenant.id } });
  if (!user) {
    console.error("No user found. Run the main seed first.");
    process.exit(1);
  }

  // Create 100 groves
  const groves = [];
  for (let i = 1; i <= 100; i++) {
    const grove = await db.grove.create({
      data: {
        name: `Grove ${i}`,
        location: pick(LOCATIONS),
        area: parseFloat((Math.random() * 10 + 0.5).toFixed(2)),
        treeCount: rand(20, 500),
        tenantId: tenant.id,
        varieties: {
          create: Array.from(
            new Set(
              Array.from({ length: rand(1, 3) }, () => pick(OLIVE_VARIETIES)),
            ),
          ).map((variety) => ({
            variety,
            treeCount: rand(10, 200),
          })),
        },
      },
    });
    groves.push(grove);
  }
  console.log(`Created ${groves.length} groves`);

  // Create 5 harvests spread across random groves
  const harvests = [];
  for (let i = 0; i < 5; i++) {
    const grove = pick(groves);
    const quantityKg = parseFloat((Math.random() * 2000 + 100).toFixed(1));
    const oilYieldPct = parseFloat((Math.random() * 15 + 8).toFixed(1));
    const oilYieldLt = parseFloat(
      ((quantityKg * oilYieldPct) / 100).toFixed(1),
    );

    const harvest = await db.harvest.create({
      data: {
        date: randomDate(2023, 2025),
        quantityKg,
        oilYieldLt,
        oilYieldPct,
        method: pick(HARVEST_METHODS),
        notes: pick([
          "Good quality olives",
          "Early harvest, higher acidity",
          "Late season pick",
          "Excellent oil quality",
          null,
        ]),
        groveId: grove.id,
        recordedById: user.id,
        tenantId: tenant.id,
      },
    });
    harvests.push(harvest);
  }
  console.log(`Created ${harvests.length} harvests`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
