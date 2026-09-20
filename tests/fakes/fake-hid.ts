import { decodeFrame, encodeFrame } from '../../src/device/protocol';
import type { HidDataListener, HidTransport } from '../../src/device/transport';

export class FakeHidTransport implements HidTransport {
  readonly writes: Array<{ command: number; payload: Buffer }> = [];
  private listener?: HidDataListener;
  private closed = false;

  async write(report: Buffer): Promise<void> {
    const packet = report[0] === 0 ? report.subarray(1) : report;
    const frame = decodeFrame(packet);
    this.writes.push({ command: frame.command, payload: frame.payload });
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
  }

  emitButton(index: number, pressed: boolean): void {
    if (this.closed) return;
    const payload = Buffer.from([0x01, index, 0x01, pressed ? 0x01 : 0x00]);
    this.listener?.(encodeFrame(0x0101, payload));
  }

  emitError(error: Error): void {
    this.listener?.(Buffer.from(error.message));
  }
}
