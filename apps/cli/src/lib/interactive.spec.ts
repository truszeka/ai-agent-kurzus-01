import { EventEmitter } from 'node:events';
import type { Interface } from 'node:readline';
import { describe, expect, it, vi } from 'vitest';
import { runInteractive } from './interactive';

function createFakeReadline(): Interface {
  const emitter = new EventEmitter();
  return Object.assign(emitter, {
    close: () => emitter.emit('close'),
  }) as unknown as Interface;
}

describe('runInteractive', () => {
  it('should echo each line received until "exit" is entered', async () => {
    const rl = createFakeReadline();
    const onOutput = vi.fn();

    const done = runInteractive(rl, onOutput);
    rl.emit('line', 'szia');
    rl.emit('line', 'mizu');
    rl.emit('line', 'exit');
    await done;

    expect(onOutput).toHaveBeenNthCalledWith(1, 'szia');
    expect(onOutput).toHaveBeenNthCalledWith(2, 'mizu');
    expect(onOutput).toHaveBeenCalledTimes(2);
  });

  it('should resolve when the readline interface closes', async () => {
    const rl = createFakeReadline();
    const onOutput = vi.fn();

    const done = runInteractive(rl, onOutput);
    rl.emit('close');

    await expect(done).resolves.toBeUndefined();
    expect(onOutput).not.toHaveBeenCalled();
  });
});
