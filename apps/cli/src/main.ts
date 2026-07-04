import { createInterface } from 'node:readline';
import { askAgent, closeReadOnlyPool, getConfig, type AskAgentResult } from '@plantbase/core';
import { Command } from 'commander';
import { runInteractive } from './lib/interactive.js';

// A CLI-t a repo gyökeréről futtatjuk (pnpm plantbase / node dist/apps/cli/main.js),
// ezért a .env is ott van; hiánya nem hiba (pl. CI-ban vagy tesztben nincs .env).
try {
  process.loadEnvFile();
} catch {
  // nincs .env — a folyamat env-változóira hagyatkozunk
}

// Fail-fast config-validáció induláskor, mielőtt bármilyen parancs lefutna.
try {
  getConfig();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const program = new Command();

program
  .name('plantbase')
  .description('Plantbase CLI')
  .version('0.0.1')
  .option('--show-prompt', 'a system prompt megjelenítése a válasz előtt (FR5)')
  .option('--quiet', 'élő trace-kimenet elnyomása, csak a végső válasz jelenik meg');

async function askOnce(question: string): Promise<void> {
  const { showPrompt, quiet } = program.opts<{ showPrompt?: boolean; quiet?: boolean }>();
  const { answer, systemPrompt } = await askAgent(question, { showPrompt, quiet });
  if (showPrompt && systemPrompt) {
    console.log('--- system prompt ---');
    console.log(systemPrompt);
    console.log('--- válasz ---');
  }
  console.log(answer);
}

async function runInteractiveSession(): Promise<void> {
  const { showPrompt, quiet } = program.opts<{ showPrompt?: boolean; quiet?: boolean }>();
  console.log('Plantbase AI asszisztens — kérdezz a növényekről! (kilépés: exit / quit / kilép)');

  let history: AskAgentResult['history'] | undefined;
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  process.stdout.write('> ');
  await runInteractive(rl, async (line) => {
    const result = await askAgent(line, { showPrompt, quiet, history });
    history = result.history;
    if (showPrompt && result.systemPrompt) {
      console.log('--- system prompt ---');
      console.log(result.systemPrompt);
      console.log('--- válasz ---');
    }
    console.log(result.answer);
    process.stdout.write('> ');
  });
}

program
  .command('ask')
  .argument('[text]', 'a kérdés szövege; ha elmarad, interaktív mód indul')
  .description('elküldi a kérdést a Plantbase agentnek, szöveg nélkül interaktív módot indít')
  .action(async (text?: string) => {
    if (text) {
      await askOnce(text);
    } else {
      await runInteractiveSession();
    }
  });

// Alparancs nélküli `plantbase` a súgót írja ki és kilép (base repo minta).
if (process.argv.length <= 2) {
  program.help();
}

try {
  await program.parseAsync(process.argv);
} finally {
  await closeReadOnlyPool();
}
