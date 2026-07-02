import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

export { PrismaClient } from './generated/prisma/client.js';
export type { Product } from './generated/prisma/client.js';

// A Prisma RW kapcsolaton (DATABASE_URL) fut: séma, migráció, seed.
// Az agent runSql toolja NEM ezt használja, hanem a read-only pg klienst (architektura.md 2. pont).
export function createDbClient(connectionString = process.env['DATABASE_URL']): PrismaClient {
  if (!connectionString) {
    throw new Error('DATABASE_URL nincs beállítva.');
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}
