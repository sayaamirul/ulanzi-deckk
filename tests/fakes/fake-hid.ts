import { decodeFrame, encodeFrame } from '../../src/device/protocol';
import type { HidDataListener, HidErrorListener, HidTransport } from '../../src/device/transport';

export class FakeHidTransport implements HidTransport {
  readonly writes: Array<{ command: number; payload: Buffer }> = [];
  readonly rawWrites: Buffer[] = [];
  readonly operations: string[] = [];
  closeCalls = 0;
  private listener?: HidDataListener;
  private readonly errorListeners = new Set<HidErrorListener>();
  private closed = false;
  onWrite?: (report: Buffer, transport: FakeHidTransport) => void;

  async write(report: Buffer): Promise<void> {
    this.rawWrites.push(Buffer.from(report));
    if (report.subarray(0, 2).equals(Buffer.from([0x7c, 0x7c]))) {
      const command = report.readUInt16BE(2);
      const payload = command === 0x0001
        ? Buffer.from(report.subarray(8))
        : decodeFrame(report).payload;
      this.writes.push({ command, payload });
      this.operations.push(`write:${command.toString(16).padStart(4, '0')}`);
    } else {
      this.operations.push('write:continuation');
    }
    this.onWrite?.(report, this);
  }

  onError(listener: HidErrorListener): () => void {
    this.operations.push('listen:error');
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  onData(listener: HidDataListener): () => void {
    this.operations.push('listen:data');
    this.listener = listener;
    return () => {
      if (this.listener === listener) this.listener = undefined;
    };
  }

  async close(): Promise<void> {
    this.closeCalls += 1;
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

  emitRaw(data: Buffer): void {
    if (!this.closed) this.listener?.(data);
  }

  emitFrame(command: number, payload: Buffer = Buffer.alloc(0)): void {
    if (!this.closed) {
      this.operations.push(`read:${command.toString(16).padStart(4, '0')}`);
      this.listener?.(encodeFrame(command, payload));
    }
  }
}
