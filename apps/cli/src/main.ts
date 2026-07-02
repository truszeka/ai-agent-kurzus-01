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

program.name('plantbase').description('Plantbase CLI').version('0.0.1');

program
  .command('ask')
  .argument('<text>', 'a kérdés szövege')
  .description('elküldi a kérdést a Plantbase agentnek (DB-hozzáférés nélkül)')
  .action(async (text: string) => {
    const { answer } = await askAgent(text);
    console.log(answer);
  });

program.action(async () => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await runInteractive(rl, async (line) => {
    const { answer } = await askAgent(line);
    console.log(answer);
  });
});

await program.parseAsync(process.argv);
