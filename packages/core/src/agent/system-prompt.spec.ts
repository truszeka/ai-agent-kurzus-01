import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadSystemPrompt } from './system-prompt';

describe('loadSystemPrompt', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'plantbase-prompt-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('should return the file contents verbatim', () => {
    const path = join(dir, 'system-prompt.md');
    writeFileSync(path, '# Plantbase Agent prompt\n', 'utf8');

    expect(loadSystemPrompt(path)).toBe('# Plantbase Agent prompt\n');
  });

  it('should throw when the file does not exist', () => {
    expect(() => loadSystemPrompt(join(dir, 'missing.md'))).toThrow();
  });
});
