import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const poolInstances: { end: ReturnType<typeof vi.fn> }[] = [];

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(function PoolMock() {
    const instance = { end: vi.fn().mockResolvedValue(undefined) };
    poolInstances.push(instance);
    return instance;
  }),
}));

describe('db-pool', () => {
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    poolInstances.length = 0;
    process.env['DATABASE_URL_READONLY'] = 'postgres://localhost/plantbase';
    const { resetConfigForTests } = await import('../config');
    resetConfigForTests();
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    const { closeReadOnlyPool } = await import('./db-pool');
    await closeReadOnlyPool();
  });

  it('should return the same pool instance on repeated calls', async () => {
    const { getReadOnlyPool } = await import('./db-pool');

    const first = getReadOnlyPool();
    const second = getReadOnlyPool();

    expect(first).toBe(second);
    expect(poolInstances).toHaveLength(1);
  });

  it('should close and reset the singleton so a new pool is created afterwards', async () => {
    const { getReadOnlyPool, closeReadOnlyPool } = await import('./db-pool');

    const first = getReadOnlyPool();
    await closeReadOnlyPool();
    const second = getReadOnlyPool();

    expect(first.end).toHaveBeenCalledTimes(1);
    expect(second).not.toBe(first);
  });
});
