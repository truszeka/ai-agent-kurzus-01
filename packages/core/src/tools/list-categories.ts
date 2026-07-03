import type { Pool } from 'pg';
import { executeReadOnlyQuery } from './read-only-query.js';

const LIST_CATEGORIES_QUERY = 'SELECT DISTINCT category FROM products ORDER BY category';

export async function listCategories(pool: Pool): Promise<string[]> {
  const rows = await executeReadOnlyQuery(LIST_CATEGORIES_QUERY, pool);
  return rows.map((row) => String(row['category']));
}
