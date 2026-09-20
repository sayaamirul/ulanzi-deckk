import { describe, expect, it, vi } from 'vitest';
import { DeviceManager } from '../../src/device/device-manager';
import { FakeHidTransport } from '../fakes/fake-hid';

describe('device manager', () => {
  it('reports connected when a matching device opens', async () => {
    const transport = new FakeHidTransport();
    const factory = {
      list: vi.fn().mockResolvedValue([{ path: '/dev/hidraw-test', vendorId: 0x2207, productId: 0x0019, interface: 0 }]),
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
});
