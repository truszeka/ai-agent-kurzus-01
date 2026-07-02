// Plantbase — Prisma seed script (előre kész, nem kell élőben generálni).
// Eredeti forrás: seed/seed.ts. A Prisma 7 driver-adapteres kliens miatt a
// PrismaClient import és a kapcsolat-létrehozás lett igazítva; a seed-adat
// (plants.ts) és a betöltés logikája változatlan.

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { plants } from './plants.js';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.product.deleteMany(); // idempotens újraseedeléshez
  const result = await prisma.product.createMany({ data: plants });
  console.log(`Seed kész: ${result.count} növény betöltve.`);
}

main()
  .catch((e) => {
    console.error('Seed hiba:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
