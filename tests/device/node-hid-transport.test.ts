import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  type NativeListener = (value: Buffer | Error) => void;
  const listeners = {
    data: new Set<NativeListener>(),
    error: new Set<NativeListener>(),
  };
  const device = {
    write: vi.fn(async () => undefined),
    read: vi.fn(() => new Promise<number[]>(() => undefined)),
    close: vi.fn(async () => undefined),
    on: vi.fn((event: 'data' | 'error', listener: NativeListener) => {
      listeners[event].add(listener);
      return device;
    }),
    off: vi.fn((event: 'data' | 'error', listener: NativeListener) => {
      listeners[event].delete(listener);
      return device;
    }),
  };
  return {
    device,
    emitData: (data: Buffer) => listeners.data.forEach((listener) => listener(data)),
    emitError: (error: Error) => listeners.error.forEach((listener) => listener(error)),
    resetListeners: () => {
      listeners.data.clear();
      listeners.error.clear();
    },
    open: vi.fn(async () => device),
    devices: vi.fn(async () => []),
  };
});

vi.mock('node-hid', () => ({
  HIDAsync: { open: mocks.open },
  devicesAsync: mocks.devices,
}));

import { NodeHidTransport } from '../../src/device/node-hid-transport';
import type { DeviceDescriptor } from '../../src/device/device-manager';

const descriptor: DeviceDescriptor = {
  path: '/dev/hidraw-test',
  vendorId: 0x2207,
  productId: 0x0019,
  interface: 0,
};

describe('Node HID transport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resetListeners();
  });

  it('prepends exactly one zero report ID', async () => {
    const transport = await NodeHidTransport.open(descriptor);
    const report = Buffer.alloc(1024, 0x5a);

    await transport.write(report);

    expect(mocks.device.write).toHaveBeenCalledWith(Buffer.concat([Buffer.from([0]), report]));
    await transport.close();
  });

  it('rejects reports that are not exactly 1024 bytes', async () => {
    const transport = await NodeHidTransport.open(descriptor);

    await expect(transport.write(Buffer.alloc(1023))).rejects.toThrow(/1024/);
    expect(mocks.device.write).not.toHaveBeenCalled();
    await transport.close();
  });

  it('forwards native HID errors', async () => {
    const transport = await NodeHidTransport.open(descriptor);
    const errors: Error[] = [];
    transport.onError((error) => errors.push(error));

    mocks.emitError(new Error('device removed'));

    await vi.waitFor(() => expect(errors).toEqual([
      expect.objectContaining({ message: 'device removed' }),
    ]));
    await transport.close();
  });

  it('receives event-driven data without occupying the HID operation queue', async () => {
    const transport = await NodeHidTransport.open(descriptor);
    const received: Buffer[] = [];
    transport.onData((data) => received.push(data));

    mocks.emitData(Buffer.from([0x7c, 0x7c, 0x01, 0x03]));

    expect(received).toEqual([Buffer.from([0x7c, 0x7c, 0x01, 0x03])]);
    expect(mocks.device.read).not.toHaveBeenCalled();
    await expect(transport.write(Buffer.alloc(1024))).resolves.toBeUndefined();
    await transport.close();
  });
});
