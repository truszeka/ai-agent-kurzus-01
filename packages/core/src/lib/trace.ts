import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface TraceOptions {
  quiet?: boolean;
  logsDir?: string;
}

function agentLogPath(logsDir: string): string {
  mkdirSync(logsDir, { recursive: true });
  return join(logsDir, 'agent.log');
}

/**
 * Egy sort ír a folyamatos, tail -f-elhető logs/agent.log-ba (mindig), és —
 * ha nincs quiet mód — a konzolra (stderr-re, hogy ne keveredjen a válasz
 * stdout-jával).
 */
function emit(message: string, options: TraceOptions = {}): void {
  const logsDir = options.logsDir ?? join(process.cwd(), 'logs');
  const line = `[${new Date().toISOString()}] ${message}`;
  appendFileSync(agentLogPath(logsDir), `${line}\n`, 'utf8');
  if (!options.quiet) {
    console.error(line);
  }
}

export function traceLlmRequest(turn: number, options?: TraceOptions): void {
  emit(`LLM hívás indul (${turn + 1}. kör)`, options);
}

export function traceLlmResponse(
  turn: number,
  stopReason: string | null,
  usage: { inputTokens: number; outputTokens: number },
  options?: TraceOptions,
): void {
  emit(
    `LLM válasz (${turn + 1}. kör): stop_reason=${stopReason}, ` +
      `tokens=${usage.inputTokens}/${usage.outputTokens} (be/ki)`,
    options,
  );
}

export function traceToolStart(name: string, input: unknown, options?: TraceOptions): void {
  emit(`Tool hívás: ${name}(${JSON.stringify(input)})`, options);
}

export function traceToolEnd(name: string, result: unknown, options?: TraceOptions): void {
  emit(`Tool eredmény: ${name} -> ${JSON.stringify(result)}`, options);
}

export function traceToolError(name: string, error: string, options?: TraceOptions): void {
  emit(`Tool hiba: ${name} -> ${error}`, options);
}
