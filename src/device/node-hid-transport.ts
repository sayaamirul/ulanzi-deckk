import { HIDAsync, devicesAsync } from 'node-hid';
import type { DeviceDescriptor } from './device-manager';
import type { HidDataListener, HidErrorListener, HidTransport } from './transport';
import { FRAME_SIZE } from './protocol';

export const ULANZI_VENDOR_ID = 0x2207;
export const ULANZI_D200H_PRODUCT_ID = 0x0019;

export class NodeHidTransport implements HidTransport {
  private listener?: HidDataListener;
  private readonly errorListeners = new Set<HidErrorListener>();
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
    if (report.length !== FRAME_SIZE) {
      throw new RangeError(`HID protocol report must be exactly ${FRAME_SIZE} bytes`);
    }
    await this.device.write(Buffer.concat([Buffer.from([0]), report]));
  }

  onError(listener: HidErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
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
    this.errorListeners.clear();
    await this.device.close();
  }

  private async readLoop(): Promise<void> {
    while (!this.closed) {
      try {
        const data = await this.device.read(50);
        if (data && !this.closed) this.listener?.(Buffer.from(data));
      } catch (error) {
        if (!this.closed) {
          const failure = error instanceof Error ? error : new Error(String(error));
          for (const listener of this.errorListeners) listener(failure);
        }
        return;
      }
    }
  }
}
