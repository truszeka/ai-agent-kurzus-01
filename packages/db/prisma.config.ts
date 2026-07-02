import { defineConfig, env } from 'prisma/config';
import { resolve } from 'node:path';

// A .env a repo gyökerén él (architektura.md), a Prisma CLI viszont packages/db-ből fut.
process.loadEnvFile(resolve(import.meta.dirname, '../../.env'));

type Env = {
  DATABASE_URL: string;
};

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env<Env>('DATABASE_URL'),
  },
});
