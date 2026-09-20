import { D200HDevice } from './d200h-device';
import type { ButtonEvent, ButtonListener } from './d200h-device';
import type { DeviceRuntimeState } from '../domain/state/types';
import type { RenderedSlot } from '../domain/profile/types';
import type { HidTransport } from './transport';

export type DeviceDescriptor = {
  path: string;
  vendorId: number;
  productId: number;
  interface: number;
  manufacturer?: string;
  product?: string;
};

export type DeviceFactory = {
  list(): Promise<DeviceDescriptor[]>;
  open(descriptor: DeviceDescriptor): Promise<HidTransport>;
};

type DeviceManagerOptions = {
  reconnect?: boolean;
  initialSlots?: ConstructorParameters<typeof D200HDevice>[1];
  retryDelaysMs?: number[];
};

type StateListener = (state: DeviceRuntimeState) => void;

export class DeviceManager {
  private state: DeviceRuntimeState = { status: 'disconnected' };
  private readonly stateListeners = new Set<StateListener>();
  private readonly buttonListeners = new Set<ButtonListener>();
  private readonly reconnect: boolean;
  private readonly initialSlots: RenderedSlot[];
  private readonly retryDelaysMs: number[];
  private attempt = 0;
  private timer?: NodeJS.Timeout;
  private started = false;
  private device?: D200HDevice;

  constructor(private readonly factory: DeviceFactory, options: DeviceManagerOptions = {}) {
    this.reconnect = options.reconnect ?? true;
    this.initialSlots = options.initialSlots ?? [];
    this.retryDelaysMs = options.retryDelaysMs ?? [1000, 2000, 4000, 8000, 15000];
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    await this.tryConnect();
  }

  async stop(): Promise<void> {
    this.started = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    await this.device?.disconnect();
    this.device = undefined;
    this.setState({ status: 'disconnected' });
  }

  getState(): DeviceRuntimeState {
    return { ...this.state };
  }

  onState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  onButton(listener: ButtonListener): () => void {
    this.buttonListeners.add(listener);
    return () => this.buttonListeners.delete(listener);
  }

  async setPage(slots: RenderedSlot[]): Promise<void> {
    await this.device?.setPage(slots);
  }

  async updateSlots(slots: RenderedSlot[]): Promise<void> {
    await this.device?.updateSlots(slots);
  }

  async setBrightness(value: number): Promise<void> {
    await this.device?.setBrightness(value);
  }

  private async tryConnect(): Promise<void> {
    if (!this.started) return;
    this.setState({ status: 'connecting' });

    try {
      const [descriptor] = await this.factory.list();
      if (!descriptor) {
        this.setState({ status: 'disconnected' });
        this.scheduleReconnect();
        return;
      }

      const transport = await this.factory.open(descriptor);
      const device = new D200HDevice(transport, this.initialSlots);
      device.onButton((event: ButtonEvent) => {
        for (const listener of this.buttonListeners) listener(event);
      });
      await device.connect();
      this.device = device;
      this.attempt = 0;
      this.setState({ status: 'connected' });
    } catch (error) {
      this.setState({ status: 'error', message: error instanceof Error ? error.message : String(error) });
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (!this.started || !this.reconnect || this.timer) return;
    const delay = this.retryDelaysMs[Math.min(this.attempt, this.retryDelaysMs.length - 1)];
    this.attempt += 1;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.tryConnect();
    }, delay);
  }

  private setState(state: DeviceRuntimeState): void {
    this.state = state;
    for (const listener of this.stateListeners) listener(this.getState());
  }
}
