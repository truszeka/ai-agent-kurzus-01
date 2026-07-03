import { createInterface } from 'node:readline';
import { askAgent } from '@plantbase/core';
import { Command } from 'commander';
import { runInteractive } from './lib/interactive.js';

// A CLI-t a repo gyökeréről futtatjuk (pnpm plantbase / node dist/apps/cli/main.js),
// ezért a .env is ott van; hiánya nem hiba (pl. CI-ban vagy tesztben nincs .env).
try {
  process.loadEnvFile();
} catch {
  // nincs .env — a folyamat env-változóira hagyatkozunk
}

const program = new Command();

program
  .name('plantbase')
  .description('Plantbase CLI')
  .version('0.0.1')
  .option('--show-prompt', 'a system prompt megjelenítése a válasz előtt (FR5)');

async function handleAsk(question: string): Promise<void> {
  const { showPrompt } = program.opts<{ showPrompt?: boolean }>();
  const { answer, systemPrompt } = await askAgent(question, { showPrompt });
  if (showPrompt && systemPrompt) {
    console.log('--- system prompt ---');
    console.log(systemPrompt);
    console.log('--- válasz ---');
  }
  console.log(answer);
}

program
  .command('ask')
  .argument('<text>', 'a kérdés szövege')
  .description('elküldi a kérdést a Plantbase agentnek')
  .action(handleAsk);

program.action(async () => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await runInteractive(rl, handleAsk);
});

await program.parseAsync(process.argv);
