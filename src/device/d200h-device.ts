import { buildButtonArchive, buildPartialButtonArchive } from './archive';
import { decodeFrame, encodeFrame, FRAME_PAYLOAD_SIZE } from './protocol';
import type { RenderedSlot } from '../domain/profile/types';
import type { HidTransport } from './transport';

export type ButtonEvent = { index: number; pressed: boolean };
export type ButtonListener = (event: ButtonEvent) => void;

const REPORT_ID = Buffer.from([0x00]);

export class D200HDevice {
  private unsubscribe?: () => void;
  private readonly listeners = new Set<ButtonListener>();
  private slots: RenderedSlot[];

  constructor(private readonly transport: HidTransport, initialSlots: RenderedSlot[] = []) {
    this.slots = initialSlots;
  }

  async connect(): Promise<void> {
    this.unsubscribe = this.transport.onData((data) => this.handleData(data));
    await this.sendArchive(0x0001, await buildButtonArchive(this.slots));
  }

  async disconnect(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    await this.transport.close();
  }

  async setPage(slots: RenderedSlot[]): Promise<void> {
    this.slots = slots;
    await this.sendArchive(0x0001, await buildButtonArchive(slots));
  }

  async updateSlots(slots: RenderedSlot[]): Promise<void> {
    await this.sendArchive(0x000d, await buildPartialButtonArchive(slots));
  }

  async setBrightness(value: number): Promise<void> {
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      throw new RangeError('brightness must be an integer between 0 and 100');
    }
    await this.sendPayload(0x000a, Buffer.from(String(value), 'ascii'));
  }

  onButton(listener: ButtonListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private handleData(data: Buffer): void {
    const packet = data[0] === 0 ? data.subarray(1) : data;
    try {
      const frame = decodeFrame(packet);
      if (frame.event?.kind !== 'button' || frame.event.index > 12) return;
      const event: ButtonEvent = { index: frame.event.index, pressed: frame.event.pressed };
      for (const listener of this.listeners) listener(event);
    } catch {
      // Malformed reports are ignored; the manager continues listening for valid reports.
    }
  }

  private async sendArchive(command: number, archive: Buffer): Promise<void> {
    await this.sendPayload(command, archive);
  }

  private async sendPayload(command: number, payload: Buffer): Promise<void> {
    for (let offset = 0; offset < payload.length || offset === 0; offset += FRAME_PAYLOAD_SIZE) {
      const chunk = payload.subarray(offset, offset + FRAME_PAYLOAD_SIZE);
      await this.transport.write(Buffer.concat([REPORT_ID, encodeFrame(command, chunk)]));
    }
  }
}
