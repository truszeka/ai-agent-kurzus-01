import { createInterface } from 'node:readline';
import { Command } from 'commander';
import { echo } from './lib/echo.js';
import { runInteractive } from './lib/interactive.js';

const program = new Command();

program.name('plantbase').description('Plantbase CLI').version('0.0.1');

program
  .command('ask')
  .argument('<text>', 'a kérdés szövege')
  .description('visszaírja a bemenetet (echo, LLM és DB nélkül)')
  .action((text: string) => {
    console.log(echo(text));
  });

program.action(async () => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await runInteractive(rl, (line) => console.log(line));
});

await program.parseAsync(process.argv);
