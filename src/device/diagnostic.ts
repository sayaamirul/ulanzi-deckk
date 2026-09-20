import type { DeviceDescriptor } from './device-manager';

export type DeviceList = { list(): Promise<DeviceDescriptor[]> };

export const listD200H = async (source: DeviceList): Promise<string> => {
  const devices = (await source.list()).filter((device) => device.vendorId === 0x2207 && device.productId === 0x0019);
  if (devices.length === 0) return 'D200H not found (expected USB device 2207:0019)';
  return devices.map((device) => `D200H found: ${device.path} (2207:0019, interface ${device.interface})`).join('\n');
};
