import { Pool } from 'pg';
import { getConfig } from '../config.js';

let pool: Pool | undefined;

/**
 * Modul-szintű singleton pool: a CLI teljes élettartama alatt egyetlen
 * kapcsolat-készletet tart életre (nem nyit/zár új Pool-t kérdésenként).
 */
export function getReadOnlyPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: getConfig().databaseUrlReadonly,
      max: 4,
      statement_timeout: 5000,
      application_name: 'plantbase-cli',
    });
  }
  return pool;
}

export async function closeReadOnlyPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
