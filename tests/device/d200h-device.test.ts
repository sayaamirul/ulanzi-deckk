import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { D200HDevice } from '../../src/device/d200h-device';
import type { RenderedSlot } from '../../src/domain/profile/types';
import { FakeHidTransport } from '../fakes/fake-hid';

const settles = async (promise: Promise<unknown>): Promise<'resolved' | 'rejected' | 'pending'> => {
  let state: 'resolved' | 'rejected' | 'pending' = 'pending';
  void promise.then(() => { state = 'resolved'; }, () => { state = 'rejected'; });
  await Promise.resolve();
  return state;
};

const autoHandshake = (): FakeHidTransport => {
  const transport = new FakeHidTransport();
  let pageWrites = 0;
  transport.onWrite = (report, fake) => {
    if (!report.subarray(0, 2).equals(Buffer.from([0x7c, 0x7c]))) return;
    const command = report.readUInt16BE(2);
    if (command === 0x0006 && !fake.operations.includes('read:0303')) {
      fake.emitFrame(0x0303, Buffer.from('{}'));
    }
    if (command === 0x0001 && ++pageWrites === 1) fake.emitFrame(0x010b);
  };
  return transport;
};

const noisySlot = async (): Promise<RenderedSlot> => {
  const pixels = Buffer.alloc(196 * 196 * 3);
  let value = 0x12345678;
  for (let index = 0; index < pixels.length; index += 1) {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    pixels[index] = value & 0xff;
  }
  return {
    id: '0_0',
    visual: 'active',
    label: 'Noisy',
    png: await sharp(pixels, { raw: { width: 196, height: 196, channels: 3 } }).png().toBuffer(),
  };
};

describe('D200H device', () => {
  it('performs the handshake in order and waits for both responses', async () => {
    const transport = new FakeHidTransport();
    const device = new D200HDevice(transport);

    const connection = device.connect();
    expect(await settles(connection)).toBe('pending');
    expect(transport.operations).toEqual(['listen:data', 'listen:error', 'write:0006']);

    transport.emitFrame(0x0303, Buffer.from('{"version":"2.0.3"}'));
    await vi.waitFor(() => expect(transport.operations).toContain('write:0001'));
    expect(await settles(connection)).toBe('pending');

    transport.emitFrame(0x010b);
    await connection;

    expect(transport.operations).toEqual([
      'listen:data',
      'listen:error',
      'write:0006',
      'read:0303',
      'write:0001',
      'read:010b',
    ]);
    await device.disconnect();
  });

  it('observes synchronous handshake responses because listeners and waiters are registered first', async () => {
    const transport = new FakeHidTransport();
    transport.onWrite = (report, fake) => {
      const command = report.subarray(0, 2).equals(Buffer.from([0x7c, 0x7c]))
        ? report.readUInt16BE(2)
        : undefined;
      if (command === 0x0006) fake.emitFrame(0x0303, Buffer.from('{}'));
      if (command === 0x0001) fake.emitFrame(0x010b);
    };

    const device = new D200HDevice(transport);
    await device.connect();

    expect(transport.operations).toEqual([
      'listen:data',
      'listen:error',
      'write:0006',
      'read:0303',
      'write:0001',
      'read:010b',
    ]);
    await device.disconnect();
  });

  it('times out while waiting for device info', async () => {
    vi.useFakeTimers();
    try {
      const device = new D200HDevice(new FakeHidTransport(), [], { handshakeTimeoutMs: 25 });
      const connection = device.connect();
      const rejection = expect(connection).rejects.toThrow('Timed out waiting for D200H device info');

      await vi.advanceTimersByTimeAsync(25);

      await rejection;
    } finally {
      vi.useRealTimers();
    }
  });

  it('times out while waiting for the page acknowledgement', async () => {
    vi.useFakeTimers();
    try {
      const transport = new FakeHidTransport();
      transport.onWrite = (report, fake) => {
        if (report.readUInt16BE(2) === 0x0006) fake.emitFrame(0x0303, Buffer.from('{}'));
      };
      const device = new D200HDevice(transport, [], { archiveAckTimeoutMs: 25 });
      const connection = device.connect();
      const rejection = expect(connection).rejects.toThrow('Timed out waiting for D200H page acknowledgement');
      await vi.waitFor(() => expect(transport.operations).toContain('write:0001'));

      await vi.advanceTimersByTimeAsync(25);

      await rejection;
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancels an active handshake and closes exactly once on disconnect', async () => {
    vi.useFakeTimers();
    try {
      const transport = new FakeHidTransport();
      const device = new D200HDevice(transport);
      const connection = device.connect();

      await device.disconnect();
      await device.disconnect();

      await expect(connection).rejects.toThrow('D200H session disconnected');
      expect(transport.closeCalls).toBe(1);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('sends keepalives only after acknowledgement and stops them on disconnect', async () => {
    const transport = autoHandshake();
    let tick: (() => void) | undefined;
    const device = new D200HDevice(transport, [], {
      keepaliveIntervalMs: 20,
      setInterval: (callback) => {
        tick = callback;
        return 1 as unknown as ReturnType<typeof setInterval>;
      },
      clearInterval: () => { tick = undefined; },
    });
    await device.connect();
    const handshakeClockWrites = transport.writes.filter(({ command }) => command === 0x0006).length;

    tick?.();
    tick?.();
    await Promise.resolve();
    expect(transport.writes.filter(({ command }) => command === 0x0006)).toHaveLength(handshakeClockWrites + 2);

    await device.disconnect();
    tick?.();
    expect(transport.writes.filter(({ command }) => command === 0x0006)).toHaveLength(handshakeClockWrites + 2);
  });

  it('emits one failure and stops keepalives after a transport error', async () => {
    const transport = autoHandshake();
    let tick: (() => void) | undefined;
    const device = new D200HDevice(transport, [], {
      setInterval: (callback) => {
        tick = callback;
        return 1 as unknown as ReturnType<typeof setInterval>;
      },
      clearInterval: () => { tick = undefined; },
    });
    const failures: Error[] = [];
    device.onFailure((error) => failures.push(error));
    await device.connect();

    transport.emitError(new Error('device removed'));
    transport.emitError(new Error('duplicate'));
    const writeCount = transport.rawWrites.length;
    tick?.();

    expect(failures).toEqual([expect.objectContaining({ message: 'device removed' })]);
    expect(transport.rawWrites).toHaveLength(writeCount);
  });

  it('surfaces a write failure from a post-connect page upload', async () => {
    const transport = autoHandshake();
    const device = new D200HDevice(transport);
    const failures: Error[] = [];
    device.onFailure((error) => failures.push(error));
    await device.connect();
    transport.onWrite = () => { throw new Error('write failed'); };

    await expect(device.setPage([])).rejects.toThrow('write failed');

    expect(failures).toEqual([expect.objectContaining({ message: 'write failed' })]);
    await device.disconnect();
  });

  it('serializes acknowledged full-page uploads without interleaving continuation reports', async () => {
    const transport = autoHandshake();
    const device = new D200HDevice(transport);
    await device.connect();
    const operationOffset = transport.operations.length;

    const first = device.setPage([await noisySlot()]);
    const second = device.setPage([]);
    await vi.waitFor(() => {
      expect(transport.operations.slice(operationOffset).filter((operation) => operation === 'write:0001')).toHaveLength(1);
      expect(transport.operations.slice(operationOffset)).toContain('write:continuation');
    });
    expect(await settles(first)).toBe('pending');
    expect(await settles(second)).toBe('pending');

    transport.emitFrame(0x010b);
    await vi.waitFor(() => {
      expect(transport.operations.slice(operationOffset).filter((operation) => operation === 'write:0001')).toHaveLength(2);
    });
    transport.emitFrame(0x010b);

    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
    await device.disconnect();
  });

  it('uses full-page uploads for updates and rejects unverified brightness writes', async () => {
    const transport = autoHandshake();
    const device = new D200HDevice(transport);
    await device.connect();
    const update = device.updateSlots([]);
    await vi.waitFor(() => expect(transport.writes.filter(({ command }) => command === 0x0001)).toHaveLength(2));
    transport.emitFrame(0x010b);

    await update;
    await expect(device.setBrightness(80)).rejects.toThrow('D200H HID brightness is not verified');
    expect(transport.writes.some(({ command }) => command === 0x000d || command === 0x000a)).toBe(false);
    await device.disconnect();
  });

  it('emits presses and releases for indices 0 through 12 and ignores index 13 and malformed frames', async () => {
    const transport = autoHandshake();
    const device = new D200HDevice(transport);
    const received: Array<{ index: number; pressed: boolean }> = [];
    device.onButton((event) => received.push(event));
    await device.connect();

    transport.emitButton(0, true);
    transport.emitButton(0, false);
    transport.emitButton(12, true);
    transport.emitButton(12, false);
    transport.emitButton(13, true);
    transport.emitRaw(Buffer.from('malformed'));

    expect(received).toEqual([
      { index: 0, pressed: true },
      { index: 0, pressed: false },
      { index: 12, pressed: true },
      { index: 12, pressed: false },
    ]);
    await device.disconnect();
  });
});
