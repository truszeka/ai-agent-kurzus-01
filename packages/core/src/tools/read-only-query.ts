import type { Pool, QueryResult } from 'pg';

/**
 * `START TRANSACTION READ ONLY` tranzakcióban futtat egy lekérdezést — ez a
 * 2-3. védelmi réteg a DB-kapcsolat (read-only role) mellett (architektura.md 2. pont).
 * A teljes QueryResult-ot adja vissza, hogy a hívó a mezőnevekhez (fields) és
 * a tényleges sorszámhoz (rowCount) is hozzáférjen.
 */
export async function executeReadOnlyQuery(
  sql: string,
  pool: Pool,
): Promise<QueryResult<Record<string, unknown>>> {
  const client = await pool.connect();
  try {
    await client.query('START TRANSACTION READ ONLY');
    const result = await client.query(sql);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
