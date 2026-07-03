import type { Pool, PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { runSql } from './run-sql';

function createFakePool(rows: Record<string, unknown>[]): Pool {
  const client = {
    query: vi.fn().mockResolvedValue({ rows }),
    release: vi.fn(),
  } as unknown as PoolClient;

  return {
    connect: vi.fn().mockResolvedValue(client),
  } as unknown as Pool;
}

describe('runSql', () => {
  it('should run a safe SELECT within a read-only transaction and return its rows', async () => {
    const pool = createFakePool([{ id: 1, name: 'Monstera' }]);

    const result = await runSql('SELECT id, name FROM products LIMIT 20', pool);

    expect(result.rows).toEqual([{ id: 1, name: 'Monstera' }]);
    const client = await (pool.connect as unknown as () => Promise<PoolClient>)();
    expect(client.query).toHaveBeenCalledWith('START TRANSACTION READ ONLY');
    expect(client.query).toHaveBeenCalledWith('SELECT id, name FROM products LIMIT 20');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  it('should reject an unsafe query before ever connecting to the database', async () => {
    const pool = createFakePool([]);

    await expect(runSql('DROP TABLE products', pool)).rejects.toThrow();
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('should roll back and rethrow when the query fails', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce(undefined) // START TRANSACTION READ ONLY
        .mockRejectedValueOnce(new Error('boom')) // the actual query
        .mockResolvedValueOnce(undefined), // ROLLBACK
      release: vi.fn(),
    } as unknown as PoolClient;
    const pool = { connect: vi.fn().mockResolvedValue(client) } as unknown as Pool;

    await expect(runSql('SELECT id FROM products LIMIT 10', pool)).rejects.toThrow('boom');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });
});
