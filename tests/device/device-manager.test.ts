import { describe, expect, it, vi } from 'vitest';
import { DeviceManager } from '../../src/device/device-manager';
import type { RenderedSlot } from '../../src/domain/profile/types';
import { FakeHidTransport } from '../fakes/fake-hid';

const matchingDevice = { path: '/dev/hidraw-test', vendorId: 0x2207, productId: 0x0019, interface: 0 };

const autoHandshake = (): FakeHidTransport => {
  const transport = new FakeHidTransport();
  transport.onWrite = (report, fake) => {
    if (!report.subarray(0, 2).equals(Buffer.from([0x7c, 0x7c]))) return;
    const command = report.readUInt16BE(2);
    if (command === 0x0006) fake.emitFrame(0x0303, Buffer.from('{}'));
    if (command === 0x0001) fake.emitFrame(0x010b);
  };
  return transport;
};

const page: RenderedSlot[] = [{
  id: '0_0',
  visual: 'active',
  label: 'Stream',
  png: Buffer.alloc(0),
}];

describe('device manager', () => {
  it('reports connected when a matching device opens', async () => {
    const transport = autoHandshake();
    const factory = {
      list: vi.fn().mockResolvedValue([matchingDevice]),
      open: vi.fn().mockResolvedValue(transport),
    };
    const manager = new DeviceManager(factory);

    await manager.start();

    expect(manager.getState()).toEqual({ status: 'connected' });
  });

  it('reports disconnected when no matching device is present', async () => {
    const factory = {
      list: vi.fn().mockResolvedValue([]),
      open: vi.fn(),
    };
    const manager = new DeviceManager(factory, { reconnect: false });

    await manager.start();

    expect(manager.getState()).toEqual({ status: 'disconnected' });
    expect(factory.open).not.toHaveBeenCalled();
  });

  it('reconnects a failed session with the latest page', async () => {
    const first = autoHandshake();
    const second = autoHandshake();
    const factory = {
      list: vi.fn().mockResolvedValue([matchingDevice]),
      open: vi.fn()
        .mockResolvedValueOnce(first)
        .mockResolvedValueOnce(second),
    };
    const manager = new DeviceManager(factory, { retryDelaysMs: [1] });
    const states: string[] = [];
    manager.onState((state) => states.push(state.status));
    await manager.setPage(page);
    await manager.start();

    first.emitError(new Error('device removed'));
    await vi.waitFor(() => expect(factory.open).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(manager.getState()).toEqual({ status: 'connected' }));

    expect(states).toEqual(expect.arrayContaining(['connected', 'error', 'connecting', 'connected']));
    expect(first.closeCalls).toBe(1);
    expect(first.rawWrites[1]?.readUInt32LE(4)).toBe(second.rawWrites[1]?.readUInt32LE(4));
    await manager.stop();
  });

  it('stopping during the first handshake leaves no reconnect timer', async () => {
    vi.useFakeTimers();
    try {
      const transport = new FakeHidTransport();
      const factory = {
        list: vi.fn().mockResolvedValue([matchingDevice]),
        open: vi.fn().mockResolvedValue(transport),
      };
      const manager = new DeviceManager(factory, { retryDelaysMs: [10] });
      const starting = manager.start();
      await Promise.resolve();
      await Promise.resolve();

      await manager.stop();
      await starting;

      expect(transport.closeCalls).toBe(1);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
