import type { Interface } from 'node:readline';
import { echo } from './echo.js';

const EXIT_COMMAND = 'exit';

export function runInteractive(rl: Interface, onOutput: (line: string) => void): Promise<void> {
  return new Promise((resolve) => {
    rl.on('line', (input) => {
      if (input.trim() === EXIT_COMMAND) {
        rl.close();
        return;
      }
      onOutput(echo(input));
    });
    rl.on('close', () => resolve());
  });
}
