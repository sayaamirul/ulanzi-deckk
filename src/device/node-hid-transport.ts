import { HIDAsync, devicesAsync } from 'node-hid';
import type { DeviceDescriptor } from './device-manager';
import type { HidDataListener, HidTransport } from './transport';

export const ULANZI_VENDOR_ID = 0x2207;
export const ULANZI_D200H_PRODUCT_ID = 0x0019;

export class NodeHidTransport implements HidTransport {
  private listener?: HidDataListener;
  private closed = false;

  private constructor(private readonly device: HIDAsync) {
    this.readLoop();
  }

  static async list(): Promise<DeviceDescriptor[]> {
    const devices = await devicesAsync(ULANZI_VENDOR_ID, ULANZI_D200H_PRODUCT_ID);
    return devices
      .filter((device) => device.interface === 0 && Boolean(device.path))
      .map((device) => ({
        path: device.path!,
        vendorId: device.vendorId,
        productId: device.productId,
        interface: device.interface,
        manufacturer: device.manufacturer,
        product: device.product,
      }));
  }

  static async open(descriptor: DeviceDescriptor): Promise<NodeHidTransport> {
    return new NodeHidTransport(await HIDAsync.open(descriptor.path));
  }

  async write(report: Buffer): Promise<void> {
    await this.device.write(report);
  }

  onData(listener: HidDataListener): () => void {
    this.listener = listener;
    return () => {
      if (this.listener === listener) this.listener = undefined;
    };
  }

  async close(): Promise<void> {
    this.closed = true;
    this.listener = undefined;
    await this.device.close();
  }

  private async readLoop(): Promise<void> {
    while (!this.closed) {
      try {
        const data = await this.device.read();
        if (data && !this.closed) this.listener?.(Buffer.from(data));
      } catch {
        return;
      }
    }
  }
}
