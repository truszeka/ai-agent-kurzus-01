import { EventEmitter } from 'node:events';
import type { Interface } from 'node:readline';
import { describe, expect, it, vi } from 'vitest';
import { runInteractive } from './interactive';

/**
 * A valódi readline `pause()`-a felfüggeszti a további `line` események
 * kibocsátását, amíg `resume()` nem hívódik — ezt szimuláljuk itt, hogy a
 * runInteractive soros feldolgozását ténylegesen tesztelni lehessen.
 */
function createFakeReadline(): Interface {
  const emitter = new EventEmitter();
  let paused = false;
  const queue: unknown[][] = [];
  const originalEmit = emitter.emit.bind(emitter);

  const flush = () => {
    while (!paused && queue.length > 0) {
      const args = queue.shift();
      if (args) originalEmit('line', ...args);
    }
  };

  return Object.assign(emitter, {
    emit: (event: string, ...args: unknown[]) => {
      if (event === 'line') {
        queue.push(args);
        flush();
        return true;
      }
      return originalEmit(event, ...args);
    },
    close: () => originalEmit('close'),
    pause: () => {
      paused = true;
    },
    resume: () => {
      paused = false;
      flush();
    },
  }) as unknown as Interface;
}

describe('runInteractive', () => {
  it('should invoke the callback with each line received until "exit" is entered', async () => {
    const rl = createFakeReadline();
    const onLine = vi.fn();

    const done = runInteractive(rl, onLine);
    rl.emit('line', 'szia');
    rl.emit('line', 'mizu');
    rl.emit('line', 'exit');
    await done;

    expect(onLine).toHaveBeenNthCalledWith(1, 'szia');
    expect(onLine).toHaveBeenNthCalledWith(2, 'mizu');
    expect(onLine).toHaveBeenCalledTimes(2);
  });

  it('should await an async callback before processing the next line', async () => {
    const rl = createFakeReadline();
    const order: string[] = [];
    const onLine = vi.fn(async (line: string) => {
      order.push(`start:${line}`);
      await new Promise((resolve) => setTimeout(resolve, 0));
      order.push(`end:${line}`);
    });

    const done = runInteractive(rl, onLine);
    rl.emit('line', 'egy');
    rl.emit('line', 'ketto');
    rl.emit('line', 'exit');
    await done;

    expect(order).toEqual(['start:egy', 'end:egy', 'start:ketto', 'end:ketto']);
  });

  it('should resolve when the readline interface closes', async () => {
    const rl = createFakeReadline();
    const onLine = vi.fn();

    const done = runInteractive(rl, onLine);
    rl.emit('close');

    await expect(done).resolves.toBeUndefined();
    expect(onLine).not.toHaveBeenCalled();
  });
});
