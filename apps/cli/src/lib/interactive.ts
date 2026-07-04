import type { Interface } from 'node:readline';

const EXIT_COMMANDS = ['exit', 'quit', 'kilép'];

export function runInteractive(
  rl: Interface,
  onLine: (line: string) => void | Promise<void>,
): Promise<void> {
  return new Promise((resolve) => {
    let closed = false;
    rl.on('line', (input) => {
      if (EXIT_COMMANDS.includes(input.trim())) {
        rl.close();
        return;
      }
      // A readline nem várja meg az async handlert, ezért szüneteltetjük a
      // beolvasást, amíg a soros feldolgozás (pl. LLM-hívás) le nem fut. Ha a
      // bemeneti stream eközben lezárul (pl. pipe-olt input végén), ne hívjunk
      // resume()-ot egy már lezárt interface-en.
      rl.pause();
      Promise.resolve(onLine(input)).finally(() => {
        if (!closed) rl.resume();
      });
    });
    rl.on('close', () => {
      closed = true;
      resolve();
    });
  });
}
