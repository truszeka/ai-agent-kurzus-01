import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { appendJsonlLog } from './logger';

describe('appendJsonlLog', () => {
  let logsDir: string;

  beforeEach(() => {
    logsDir = mkdtempSync(join(tmpdir(), 'plantbase-logger-'));
  });

  afterEach(() => {
    rmSync(logsDir, { recursive: true, force: true });
  });

  it('should write a single JSON line containing the log entry', () => {
    appendJsonlLog(
      {
        timestamp: '2026-07-02T20:00:00.000Z',
        systemPrompt: 'prompt',
        question: 'szia',
        answer: 'szia!',
        usage: { inputTokens: 1, outputTokens: 2 },
      },
      logsDir,
    );

    const [fileName] = readdirSync(logsDir);
    const content = readFileSync(join(logsDir, fileName), 'utf8');
    const lines = content.trim().split('\n');

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toMatchObject({ question: 'szia', answer: 'szia!' });
  });

  it('should derive the file name from the timestamp', () => {
    appendJsonlLog(
      {
        timestamp: '2026-07-02T20:00:00.000Z',
        systemPrompt: 'prompt',
        question: 'q',
        answer: 'a',
        usage: { inputTokens: 0, outputTokens: 0 },
      },
      logsDir,
    );

    const [fileName] = readdirSync(logsDir);
    expect(fileName).toBe('2026-07-02T20-00-00-000Z.jsonl');
  });
});
