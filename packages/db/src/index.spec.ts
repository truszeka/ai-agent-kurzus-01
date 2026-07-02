import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDbClient } from './index';

describe('createDbClient', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should throw when no connection string is available', () => {
    vi.stubEnv('DATABASE_URL', '');
    expect(() => createDbClient(undefined)).toThrow('DATABASE_URL nincs beállítva.');
  });
});
