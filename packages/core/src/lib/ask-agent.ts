import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { appendJsonlLog } from './logger.js';
import { MINIMAL_SYSTEM_PROMPT } from './system-prompt.js';

const AskAgentInput = z.object({ question: z.string().min(1) });

const DEFAULT_MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 1024;

export interface AskAgentResult {
  answer: string;
}

function extractText(content: Anthropic.Messages.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

export async function askAgent(
  question: string,
  client: Anthropic = new Anthropic(),
): Promise<AskAgentResult> {
  const input = AskAgentInput.parse({ question });
  const model = process.env['ANTHROPIC_MODEL'] ?? DEFAULT_MODEL;

  const message = await client.messages.create({
    model,
    max_tokens: MAX_TOKENS,
    system: MINIMAL_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: input.question }],
  });

  const answer = extractText(message.content);

  appendJsonlLog({
    timestamp: new Date().toISOString(),
    systemPrompt: MINIMAL_SYSTEM_PROMPT,
    question: input.question,
    answer,
    usage: {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    },
  });

  return { answer };
}
