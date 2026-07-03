import type { Pool } from 'pg';
import { executeReadOnlyQuery } from './read-only-query.js';
import { assertSafeSelect } from './sql-guard.js';

export interface RunSqlResult {
  rows: Record<string, unknown>[];
}

export async function runSql(query: string, pool: Pool): Promise<RunSqlResult> {
  assertSafeSelect(query);
  const rows = await executeReadOnlyQuery(query, pool);
  return { rows };
}
