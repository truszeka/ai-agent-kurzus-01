import type { Pool } from 'pg';
import { listCategories } from '../tools/list-categories.js';
import { runSql } from '../tools/run-sql.js';
import { LIST_CATEGORIES_TOOL_NAME, RUN_SQL_TOOL_NAME } from './tool-definitions.js';

export type ToolExecutors = Record<string, (input: unknown) => Promise<unknown>>;

export function createDefaultToolExecutors(pool: Pool): ToolExecutors {
  return {
    [RUN_SQL_TOOL_NAME]: async (input) => {
      const { query } = input as { query: string };
      return runSql(query, pool);
    },
    [LIST_CATEGORIES_TOOL_NAME]: async () => ({ categories: await listCategories(pool) }),
  };
}
