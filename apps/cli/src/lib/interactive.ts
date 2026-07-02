import type { Interface } from 'node:readline';

const EXIT_COMMAND = 'exit';

export function runInteractive(
  rl: Interface,
  onLine: (line: string) => void | Promise<void>,
): Promise<void> {
  return new Promise((resolve) => {
    rl.on('line', (input) => {
      if (input.trim() === EXIT_COMMAND) {
        rl.close();
        return;
      }
      // A readline nem várja meg az async handlert, ezért szüneteltetjük a
      // beolvasást, amíg a soros feldolgozás (pl. LLM-hívás) le nem fut.
      rl.pause();
      Promise.resolve(onLine(input)).finally(() => rl.resume());
    });
    rl.on('close', () => resolve());
  });
}
