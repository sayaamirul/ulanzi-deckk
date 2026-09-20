import { decodeFrame, encodeFrame } from '../../src/device/protocol';
import type { HidDataListener, HidErrorListener, HidTransport } from '../../src/device/transport';

export class FakeHidTransport implements HidTransport {
  readonly writes: Array<{ command: number; payload: Buffer }> = [];
  readonly rawWrites: Buffer[] = [];
  private listener?: HidDataListener;
  private readonly errorListeners = new Set<HidErrorListener>();
  private closed = false;
  onWrite?: (report: Buffer, transport: FakeHidTransport) => void;

  async write(report: Buffer): Promise<void> {
    this.rawWrites.push(Buffer.from(report));
    if (report.subarray(0, 2).equals(Buffer.from([0x7c, 0x7c]))) {
      const frame = decodeFrame(report);
      this.writes.push({ command: frame.command, payload: frame.payload });
    }
    this.onWrite?.(report, this);
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
  }

  emitButton(index: number, pressed: boolean): void {
    if (this.closed) return;
    const payload = Buffer.from([0x01, index, 0x01, pressed ? 0x01 : 0x00]);
    this.listener?.(encodeFrame(0x0101, payload));
  }

  emitError(error: Error): void {
    for (const listener of this.errorListeners) listener(error);
  }

  emitFrame(command: number, payload: Buffer = Buffer.alloc(0)): void {
    if (!this.closed) this.listener?.(encodeFrame(command, payload));
  }
}
