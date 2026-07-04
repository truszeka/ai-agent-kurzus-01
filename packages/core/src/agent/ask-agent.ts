import Anthropic from '@anthropic-ai/sdk';
import type { Pool } from 'pg';
import { z } from 'zod';
import { getReadOnlyPool } from '../lib/db-pool.js';
import { appendJsonlLog, type ToolCallLogEntry } from '../lib/logger.js';
import { traceLlmRequest, traceLlmResponse, traceToolEnd, traceToolError, traceToolStart } from '../lib/trace.js';
import { AGENT_TOOLS } from './tool-definitions.js';
import { createDefaultToolExecutors, type ToolExecutors } from './tool-executors.js';
import { loadSystemPrompt } from './system-prompt.js';

const AskAgentInput = z.object({ question: z.string().min(1) });

const DEFAULT_MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 1536;
const MAX_TURNS = 6;
const TOO_MANY_TURNS_MESSAGE =
  'Sajnálom, ez a kérés túl sok lépést igényelne. Kérlek, fogalmazd meg egyszerűbben a kérdésed.';

export interface AskAgentOptions {
  client?: Anthropic;
  pool?: Pool;
  executors?: ToolExecutors;
  showPrompt?: boolean;
  quiet?: boolean;
  history?: Anthropic.MessageParam[];
}

export interface AskAgentResult {
  answer: string;
  systemPrompt?: string;
  history: Anthropic.MessageParam[];
}

function extractText(content: Anthropic.Messages.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

async function runTool(
  block: Anthropic.Messages.ToolUseBlock,
  executors: ToolExecutors,
  log: ToolCallLogEntry[],
  quiet: boolean | undefined,
): Promise<Anthropic.Messages.ToolResultBlockParam> {
  const executor = executors[block.name];
  traceToolStart(block.name, block.input, { quiet });
  try {
    if (!executor) {
      throw new Error(`Ismeretlen tool: ${block.name}`);
    }
    const result = await executor(block.input);
    log.push({ tool: block.name, input: block.input, result });
    traceToolEnd(block.name, result, { quiet });
    return { type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.push({ tool: block.name, input: block.input, error: message });
    traceToolError(block.name, message, { quiet });
    return {
      type: 'tool_result',
      tool_use_id: block.id,
      content: JSON.stringify({ error: message }),
      is_error: true,
    };
  }
}

export async function askAgent(
  question: string,
  options: AskAgentOptions = {},
): Promise<AskAgentResult> {
  const input = AskAgentInput.parse({ question });
  const client = options.client ?? new Anthropic();
  const model = process.env['ANTHROPIC_MODEL'] ?? DEFAULT_MODEL;
  const systemPrompt = loadSystemPrompt();
  const quiet = options.quiet;

  // Csak akkor nyúlunk a Postgres-poolhoz, ha nincs teszt-executor; ilyenkor
  // a modul-szintű singleton poolt használjuk (nem nyitunk/zárunk sajátot).
  const executors = options.executors ?? createDefaultToolExecutors(options.pool ?? getReadOnlyPool());

  const toolCalls: ToolCallLogEntry[] = [];
  const messages: Anthropic.MessageParam[] = [
    ...(options.history ?? []),
    { role: 'user', content: input.question },
  ];

  let answer = '';
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    traceLlmRequest(turn, { quiet });
    const response = await client.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      tools: AGENT_TOOLS,
      messages,
    });

    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;
    traceLlmResponse(
      turn,
      response.stop_reason,
      { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
      { quiet },
    );
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason !== 'tool_use') {
      answer = extractText(response.content);
      break;
    }

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      toolResults.push(await runTool(block, executors, toolCalls, quiet));
    }
    messages.push({ role: 'user', content: toolResults });
  }

  if (!answer) {
    answer = TOO_MANY_TURNS_MESSAGE;
  }

  appendJsonlLog({
    timestamp: new Date().toISOString(),
    systemPrompt,
    question: input.question,
    answer,
    toolCalls,
    usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
  });

  return options.showPrompt ? { answer, systemPrompt, history: messages } : { answer, history: messages };
}
