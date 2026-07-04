import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { traceLlmRequest, traceToolStart } from './trace';

describe('trace', () => {
  let logsDir: string;

  beforeEach(() => {
    logsDir = mkdtempSync(join(tmpdir(), 'plantbase-trace-'));
  });

  afterEach(() => {
    rmSync(logsDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('should always append to logs/agent.log, quiet or not', () => {
    traceLlmRequest(0, { logsDir, quiet: true });

    const [logFile] = readdirSync(logsDir);
    expect(logFile).toBe('agent.log');
    const content = readFileSync(join(logsDir, logFile), 'utf8');
    expect(content).toContain('LLM hívás indul');
  });

  it('should suppress console output in quiet mode', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    traceToolStart('runSql', { query: 'SELECT 1' }, { logsDir, quiet: true });

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('should print to console when not quiet', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    traceToolStart('runSql', { query: 'SELECT 1' }, { logsDir, quiet: false });

    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
