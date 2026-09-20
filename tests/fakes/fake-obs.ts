import type { ObsClient, ObsEvent, ObsRequest } from '../../src/actions/obs/client';

export class FakeObsClient implements ObsClient {
  readonly requests: ObsRequest[] = [];
  private readonly listeners = new Set<(event: ObsEvent) => void>();
  connected = false;

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async request<T>(request: ObsRequest): Promise<T> {
    this.requests.push(request);
    return {} as T;
  }

  onEvent(listener: (event: ObsEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: ObsEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
