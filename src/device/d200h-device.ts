import { buildButtonArchive } from './archive';
import { decodeFrame, encodeArchiveReports, encodeFrame, type ParsedFrameEvent } from './protocol';
import type { RenderedSlot } from '../domain/profile/types';
import type { HidTransport } from './transport';

export type ButtonEvent = { index: number; pressed: boolean };
export type ButtonListener = (event: ButtonEvent) => void;
export type FailureListener = (error: Error) => void;

type WaitableEventKind = Extract<ParsedFrameEvent['kind'], 'device-info' | 'archive-ack'>;

type EventWaiter = {
  resolve: () => void;
  reject: (error: Error) => void;
};

type D200HDeviceOptions = {
  handshakeTimeoutMs?: number;
  handshakeSettleMs?: number;
  archiveAckTimeoutMs?: number;
  keepaliveIntervalMs?: number;
  setTimeout?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  clearTimeout?: (timer: ReturnType<typeof setTimeout>) => void;
  setInterval?: (callback: () => void, delayMs: number) => ReturnType<typeof setInterval>;
  clearInterval?: (timer: ReturnType<typeof setInterval>) => void;
};

export class D200HDevice {
  private unsubscribe?: () => void;
  private unsubscribeError?: () => void;
  private readonly listeners = new Set<ButtonListener>();
  private readonly failureListeners = new Set<FailureListener>();
  private readonly waiters = new Map<WaitableEventKind, EventWaiter>();
  private slots: RenderedSlot[];
  private readonly handshakeTimeoutMs: number;
  private readonly handshakeSettleMs: number;
  private readonly archiveAckTimeoutMs: number;
  private readonly keepaliveIntervalMs: number;
  private readonly setTimeoutFn: NonNullable<D200HDeviceOptions['setTimeout']>;
  private readonly clearTimeoutFn: NonNullable<D200HDeviceOptions['clearTimeout']>;
  private readonly setIntervalFn: NonNullable<D200HDeviceOptions['setInterval']>;
  private readonly clearIntervalFn: NonNullable<D200HDeviceOptions['clearInterval']>;
  private keepaliveTimer?: ReturnType<typeof setInterval>;
  private uploadTail: Promise<void> = Promise.resolve();
  private disconnected = false;
  private connected = false;
  private failed = false;

  constructor(
    private readonly transport: HidTransport,
    initialSlots: RenderedSlot[] = [],
    options: D200HDeviceOptions = {},
  ) {
    this.slots = initialSlots;
    this.handshakeTimeoutMs = options.handshakeTimeoutMs ?? 5_000;
    this.handshakeSettleMs = options.handshakeSettleMs ?? 250;
    this.archiveAckTimeoutMs = options.archiveAckTimeoutMs ?? 5_000;
    this.keepaliveIntervalMs = options.keepaliveIntervalMs ?? 2_000;
    this.setTimeoutFn = options.setTimeout ?? setTimeout;
    this.clearTimeoutFn = options.clearTimeout ?? clearTimeout;
    this.setIntervalFn = options.setInterval ?? setInterval;
    this.clearIntervalFn = options.clearInterval ?? clearInterval;
  }

  async connect(): Promise<void> {
    this.unsubscribe = this.transport.onData((data) => this.handleData(data));
    this.unsubscribeError = this.transport.onError((error) => this.handleFailure(error));

    const deviceInfo = this.waitForEvent('device-info', this.handshakeTimeoutMs);
    await this.transport.write(encodeFrame(0x0006, this.clockPayload()));
    await deviceInfo;
    await this.delay(this.handshakeSettleMs);
    await this.enqueueUpload(this.slots);
    this.connected = true;
    this.startKeepalive();
  }

  async disconnect(): Promise<void> {
    if (this.disconnected) return;
    this.disconnected = true;
    this.connected = false;
    this.stopKeepalive();
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.unsubscribeError?.();
    this.unsubscribeError = undefined;
    this.rejectWaiters(new Error('D200H session disconnected'));
    await this.transport.close();
  }

  async setPage(slots: RenderedSlot[]): Promise<void> {
    this.slots = slots;
    await this.enqueueUpload(slots);
  }

  async updateSlots(slots: RenderedSlot[]): Promise<void> {
    this.slots = slots;
    await this.enqueueUpload(slots);
  }

  async setBrightness(_value: number): Promise<void> {
    throw new Error('D200H HID brightness is not verified');
  }

  onButton(listener: ButtonListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onFailure(listener: FailureListener): () => void {
    this.failureListeners.add(listener);
    return () => this.failureListeners.delete(listener);
  }

  private handleData(data: Buffer): void {
    const packet = data[0] === 0 ? data.subarray(1) : data;
    try {
      const frame = decodeFrame(packet);
      if (frame.event?.kind === 'device-info' || frame.event?.kind === 'archive-ack') {
        const waiter = this.waiters.get(frame.event.kind);
        if (waiter) {
          this.waiters.delete(frame.event.kind);
          waiter.resolve();
        }
      } else if (frame.event?.kind === 'heartbeat') {
        const waiter = this.waiters.get('device-info');
        if (waiter) {
          this.waiters.delete('device-info');
          waiter.resolve();
        }
      }
      if (frame.event?.kind !== 'button' || frame.event.index > 12) return;
      const event: ButtonEvent = { index: frame.event.index, pressed: frame.event.pressed };
      for (const listener of this.listeners) listener(event);
    } catch {
      // Malformed reports are ignored; the manager continues listening for valid reports.
    }
  }

  private clockPayload(): Buffer {
    const now = new Date();
    const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map((value) => String(value).padStart(2, '0'))
      .join(':');
    return Buffer.from(`1|2|9|${time}|1|24H`, 'ascii');
  }

  private enqueueUpload(slots: RenderedSlot[]): Promise<void> {
    const upload = this.uploadTail.then(async () => {
      if (this.disconnected) throw new Error('D200H session disconnected');
      if (this.failed) throw new Error('D200H session failed');
      try {
        await this.uploadPage(slots);
      } catch (error) {
        const failure = error instanceof Error ? error : new Error(String(error));
        if (this.connected) this.handleFailure(failure);
        throw failure;
      }
    });
    this.uploadTail = upload.catch(() => undefined);
    return upload;
  }

  private async uploadPage(slots: RenderedSlot[]): Promise<void> {
    const reports = encodeArchiveReports(await buildButtonArchive(slots));
    const acknowledgement = this.waitForEvent('archive-ack', this.archiveAckTimeoutMs);
    void acknowledgement.catch(() => undefined);
    for (const report of reports) {
      await this.transport.write(report);
    }
    await acknowledgement;
  }

  private waitForEvent(kind: WaitableEventKind, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = this.setTimeoutFn(() => {
        this.waiters.delete(kind);
        reject(new Error(kind === 'device-info'
          ? 'Timed out waiting for D200H device info'
          : 'Timed out waiting for D200H page acknowledgement'));
      }, timeoutMs);
      this.waiters.set(kind, {
        resolve: () => {
          this.clearTimeoutFn(timeout);
          resolve();
        },
        reject: (error) => {
          this.clearTimeoutFn(timeout);
          reject(error);
        },
      });
    });
  }

  private delay(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
      this.setTimeoutFn(resolve, delayMs);
    });
  }

  private rejectWaiters(error: Error): void {
    const waiters = [...this.waiters.values()];
    this.waiters.clear();
    for (const waiter of waiters) waiter.reject(error);
  }

  private startKeepalive(): void {
    this.keepaliveTimer = this.setIntervalFn(() => {
      void this.transport.write(encodeFrame(0x0006, this.clockPayload()))
        .catch((error: unknown) => this.handleFailure(
          error instanceof Error ? error : new Error(String(error)),
        ));
    }, this.keepaliveIntervalMs);
  }

  private stopKeepalive(): void {
    if (!this.keepaliveTimer) return;
    this.clearIntervalFn(this.keepaliveTimer);
    this.keepaliveTimer = undefined;
  }

  private handleFailure(error: Error): void {
    this.rejectWaiters(error);
    if (!this.connected || this.failed || this.disconnected) return;
    this.failed = true;
    this.connected = false;
    this.stopKeepalive();
    for (const listener of this.failureListeners) listener(error);
  }
}
