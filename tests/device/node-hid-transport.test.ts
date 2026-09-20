import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  let rejectRead: (error: Error) => void = () => undefined;
  const device = {
    write: vi.fn(async () => undefined),
    read: vi.fn(() => new Promise<number[]>((_resolve, reject) => { rejectRead = reject; })),
    close: vi.fn(async () => undefined),
  };
  return {
    device,
    rejectNextRead: (error: Error) => rejectRead(error),
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

  it('emits a read-loop failure', async () => {
    const transport = await NodeHidTransport.open(descriptor);
    const errors: Error[] = [];
    transport.onError((error) => errors.push(error));

    mocks.rejectNextRead(new Error('device removed'));

    await vi.waitFor(() => expect(errors).toEqual([
      expect.objectContaining({ message: 'device removed' }),
    ]));
    await transport.close();
  });
});
