import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type Anthropic from '@anthropic-ai/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { askAgent } from './ask-agent';

function textResponse(text: string) {
  return {
    content: [{ type: 'text', text }],
    stop_reason: 'end_turn',
    usage: { input_tokens: 10, output_tokens: 5 },
  };
}

function toolUseResponse(name: string, input: unknown, id = 'tool_1') {
  return {
    content: [{ type: 'tool_use', id, name, input }],
    stop_reason: 'tool_use',
    usage: { input_tokens: 10, output_tokens: 5 },
  };
}

describe('askAgent', () => {
  let logsDir: string;
  let originalCwd: string;
  let promptPath: string;

  beforeEach(() => {
    logsDir = mkdtempSync(join(tmpdir(), 'plantbase-agent-'));
    originalCwd = process.cwd();
    process.chdir(logsDir);

    // A prompt betöltő process.cwd()/docs/system-prompt.md-t vár.
    const docsDir = join(logsDir, 'docs');
    mkdirSync(docsDir, { recursive: true });
    promptPath = join(docsDir, 'system-prompt.md');
    writeFileSync(promptPath, 'Te a Plantbase AI asszisztens vagy.\n', 'utf8');
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(logsDir, { recursive: true, force: true });
  });

  it('should return the final text answer when no tool is used', async () => {
    const client = {
      messages: { create: vi.fn().mockResolvedValue(textResponse('Szia!')) },
    } as unknown as Anthropic;

    const result = await askAgent('szia', { client, executors: {} });

    expect(result.answer).toBe('Szia!');
    expect(client.messages.create).toHaveBeenCalledTimes(1);
  });

  it('should call listCategories and feed the result back before answering', async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce(toolUseResponse('listCategories', {}))
      .mockResolvedValueOnce(textResponse('Ezek a kategóriák: kaktusz, pozsgás.'));
    const client = { messages: { create } } as unknown as Anthropic;
    const listCategories = vi.fn().mockResolvedValue({ categories: ['kaktusz', 'pozsgás'] });

    const result = await askAgent('milyen kategóriák vannak?', {
      client,
      executors: { listCategories },
    });

    expect(listCategories).toHaveBeenCalledWith({});
    expect(result.answer).toBe('Ezek a kategóriák: kaktusz, pozsgás.');
    expect(create).toHaveBeenCalledTimes(2);
    // index 2: [user question, assistant tool_use, user tool_result] — a create.mock.calls
    // ugyanarra a messages tömbre mutat, amit a hívás UTÁN is tovább mutálunk, ezért fix
    // indexre hivatkozunk, nem .at(-1)-re.
    const secondCallArgs = create.mock.calls[1][0];
    const toolResultMessage = secondCallArgs.messages[2];
    expect(toolResultMessage.role).toBe('user');
    expect(toolResultMessage.content[0]).toMatchObject({
      type: 'tool_result',
      tool_use_id: 'tool_1',
    });
  });

  it('should call runSql with the generated query', async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce(
        toolUseResponse('runSql', { query: 'SELECT id FROM products LIMIT 20' }),
      )
      .mockResolvedValueOnce(textResponse('Találtam néhány növényt.'));
    const client = { messages: { create } } as unknown as Anthropic;
    const runSql = vi.fn().mockResolvedValue({ rows: [{ id: 1 }] });

    const result = await askAgent('mutass növényeket', { client, executors: { runSql } });

    expect(runSql).toHaveBeenCalledWith({ query: 'SELECT id FROM products LIMIT 20' });
    expect(result.answer).toBe('Találtam néhány növényt.');
  });

  it('should feed a tool error back to the model instead of throwing', async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce(toolUseResponse('runSql', { query: 'DROP TABLE products' }))
      .mockResolvedValueOnce(textResponse('Ezt a kérést nem tudom teljesíteni.'));
    const client = { messages: { create } } as unknown as Anthropic;
    const runSql = vi.fn().mockRejectedValue(new Error('Csak SELECT lekérdezés engedélyezett.'));

    const result = await askAgent('töröld a termékeket', { client, executors: { runSql } });

    expect(result.answer).toBe('Ezt a kérést nem tudom teljesíteni.');
    const secondCallArgs = create.mock.calls[1][0];
    const toolResultBlock = secondCallArgs.messages[2].content[0];
    expect(toolResultBlock.is_error).toBe(true);
  });

  it('should stop after the maximum number of turns and return a fallback message', async () => {
    const create = vi.fn().mockResolvedValue(toolUseResponse('listCategories', {}));
    const client = { messages: { create } } as unknown as Anthropic;
    const listCategories = vi.fn().mockResolvedValue({ categories: [] });

    const result = await askAgent('kérdés', { client, executors: { listCategories } });

    expect(result.answer).toMatch(/túl sok lépést/);
  });

  it('should reject an empty question', async () => {
    const client = { messages: { create: vi.fn() } } as unknown as Anthropic;

    await expect(askAgent('', { client, executors: {} })).rejects.toThrow();
  });

  it('should append a JSONL log entry including tool calls and usage', async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce(toolUseResponse('listCategories', {}))
      .mockResolvedValueOnce(textResponse('Ezek a kategóriák.'));
    const client = { messages: { create } } as unknown as Anthropic;
    const listCategories = vi.fn().mockResolvedValue({ categories: ['kaktusz'] });

    await askAgent('milyen kategóriák vannak?', { client, executors: { listCategories } });

    const [logFile] = readdirSync(join(logsDir, 'logs'));
    const logged = JSON.parse(readFileSync(join(logsDir, 'logs', logFile), 'utf8'));

    expect(logged.toolCalls).toEqual([
      { tool: 'listCategories', input: {}, result: { categories: ['kaktusz'] } },
    ]);
    expect(logged.usage).toEqual({ inputTokens: 20, outputTokens: 10 });
  });

  it('should include the system prompt in the result when showPrompt is set', async () => {
    const client = {
      messages: { create: vi.fn().mockResolvedValue(textResponse('Szia!')) },
    } as unknown as Anthropic;

    const result = await askAgent('szia', { client, executors: {}, showPrompt: true });

    expect(result.systemPrompt).toContain('Plantbase AI asszisztens');
  });

  it('should prepend the given history to the messages sent to the model', async () => {
    const create = vi.fn().mockResolvedValue(textResponse('Kaktusz volt az előbb is.'));
    const client = { messages: { create } } as unknown as Anthropic;
    const history: Anthropic.MessageParam[] = [
      { role: 'user', content: 'milyen kaktuszaitok vannak?' },
      { role: 'assistant', content: 'Van néhány opunciánk.' },
    ];

    await askAgent('és milyen színben?', { client, executors: {}, history });

    const callArgs = create.mock.calls[0][0];
    // A `messages` tömböt az askAgent a hívás UTÁN is mutálja (assistant válasszal),
    // ezért csak a hívás pillanatában releváns, kezdeti szeletet ellenőrizzük.
    expect(callArgs.messages.slice(0, history.length + 1)).toEqual([
      ...history,
      { role: 'user', content: 'és milyen színben?' },
    ]);
  });

  it('should return the updated history including the new turn', async () => {
    const client = {
      messages: { create: vi.fn().mockResolvedValue(textResponse('Szia!')) },
    } as unknown as Anthropic;

    const result = await askAgent('szia', { client, executors: {} });

    expect(result.history).toEqual([
      { role: 'user', content: 'szia' },
      { role: 'assistant', content: [{ type: 'text', text: 'Szia!' }] },
    ]);
  });
});
