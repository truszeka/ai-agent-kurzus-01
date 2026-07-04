import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getConfig, resetConfigForTests } from './config';

describe('getConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetConfigForTests();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetConfigForTests();
  });

  it('should throw a descriptive error when required env vars are missing', () => {
    delete process.env['DATABASE_URL_READONLY'];

    expect(() => getConfig()).toThrow(/DATABASE_URL_READONLY/);
  });

  it('should parse and cache valid config', () => {
    process.env['DATABASE_URL_READONLY'] = 'postgres://localhost/plantbase';
    delete process.env['ANTHROPIC_MODEL'];

    const config = getConfig();

    expect(config).toEqual({
      databaseUrlReadonly: 'postgres://localhost/plantbase',
      anthropicModel: undefined,
    });
    // A második hívás a gyorsítótárazott értéket adja vissza, nem olvas újra.
    process.env['DATABASE_URL_READONLY'] = 'changed';
    expect(getConfig().databaseUrlReadonly).toBe('postgres://localhost/plantbase');
  });
});
