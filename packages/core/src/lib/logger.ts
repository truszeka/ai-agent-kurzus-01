import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface AskAgentLogEntry {
  timestamp: string;
  systemPrompt: string;
  question: string;
  answer: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export function appendJsonlLog(
  entry: AskAgentLogEntry,
  logsDir = join(process.cwd(), 'logs'),
): void {
  mkdirSync(logsDir, { recursive: true });
  const fileName = `${entry.timestamp.replace(/[:.]/g, '-')}.jsonl`;
  appendFileSync(join(logsDir, fileName), `${JSON.stringify(entry)}\n`, 'utf8');
}
