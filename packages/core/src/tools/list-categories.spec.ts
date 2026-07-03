import type { Pool, PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { listCategories } from './list-categories';

function createFakePool(rows: Record<string, unknown>[]): Pool {
  const client = {
    query: vi.fn().mockResolvedValue({ rows }),
    release: vi.fn(),
  } as unknown as PoolClient;

  return {
    connect: vi.fn().mockResolvedValue(client),
  } as unknown as Pool;
}

describe('listCategories', () => {
  it('should return the category names from the fixed query', async () => {
    const pool = createFakePool([{ category: 'kaktusz' }, { category: 'szobanövény' }]);

    const categories = await listCategories(pool);

    expect(categories).toEqual(['kaktusz', 'szobanövény']);
  });

  it('should run the query inside a read-only transaction', async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    } as unknown as PoolClient;
    const pool = { connect: vi.fn().mockResolvedValue(client) } as unknown as Pool;

    await listCategories(pool);

    expect(client.query).toHaveBeenCalledWith('START TRANSACTION READ ONLY');
    expect(client.query).toHaveBeenCalledWith(
      'SELECT DISTINCT category FROM products ORDER BY category',
    );
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });
});
