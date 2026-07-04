import type { Pool } from 'pg';
import { executeReadOnlyQuery } from './read-only-query.js';
import { assertSafeSelect } from './sql-guard.js';

const MAX_ROWS = 100;

export interface RunSqlResult {
  columns: string[];
  rowCount: number;
  rows: Record<string, unknown>[];
  truncated: boolean;
}

export async function runSql(query: string, pool: Pool): Promise<RunSqlResult> {
  assertSafeSelect(query);
  const result = await executeReadOnlyQuery(query, pool);
  const truncated = result.rows.length > MAX_ROWS;
  return {
    columns: result.fields.map((field) => field.name),
    rowCount: result.rows.length,
    rows: truncated ? result.rows.slice(0, MAX_ROWS) : result.rows,
    truncated,
  };
}
