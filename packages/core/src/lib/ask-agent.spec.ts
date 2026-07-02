import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type Anthropic from '@anthropic-ai/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { askAgent } from './ask-agent';

function createFakeClient(text: string): Anthropic {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text }],
        usage: { input_tokens: 12, output_tokens: 34 },
      }),
    },
  } as unknown as Anthropic;
}

describe('askAgent', () => {
  let logsDir: string;
  let originalCwd: string;

  beforeEach(() => {
    logsDir = mkdtempSync(join(tmpdir(), 'plantbase-logs-'));
    originalCwd = process.cwd();
    process.chdir(logsDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(logsDir, { recursive: true, force: true });
  });

  it('should return the text extracted from the Anthropic response', async () => {
    const client = createFakeClient('Szia! Miben segíthetek?');

    const result = await askAgent('szia', client);

    expect(result.answer).toBe('Szia! Miben segíthetek?');
  });

  it('should call the client with the minimal system prompt and the question', async () => {
    const client = createFakeClient('válasz');

    await askAgent('milyen növényeitek vannak?', client);

    expect(client.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('Plantbase AI asszisztens'),
        messages: [{ role: 'user', content: 'milyen növényeitek vannak?' }],
      }),
    );
  });

  it('should reject an empty question', async () => {
    const client = createFakeClient('válasz');

    await expect(askAgent('', client)).rejects.toThrow();
  });

  it('should append a JSONL log entry with the token usage', async () => {
    const client = createFakeClient('válasz');

    await askAgent('szia', client);

    const [logFile] = readdirSync(join(logsDir, 'logs'));
    const logged = JSON.parse(readFileSync(join(logsDir, 'logs', logFile), 'utf8'));

    expect(logged).toMatchObject({
      question: 'szia',
      answer: 'válasz',
      usage: { inputTokens: 12, outputTokens: 34 },
    });
  });
});
