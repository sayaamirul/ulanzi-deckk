import type { ObsClient, ObsEvent, ObsRequest } from '../../src/actions/obs/client';

export class FakeObsClient implements ObsClient {
  readonly requests: ObsRequest[] = [];
  private readonly listeners = new Set<(event: ObsEvent) => void>();
  connected = false;
  disconnectCalls = 0;
  requestError?: Error;
  requestErrors: Record<string, Error> = {};
  sceneList: string[] = [];

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.disconnectCalls += 1;
    this.connected = false;
  }

  async request<T>(request: ObsRequest): Promise<T> {
    if (this.requestError) throw this.requestError;
    const requestError = this.requestErrors[request.requestType];
    if (requestError) throw requestError;
    this.requests.push(request);
    if (request.requestType === 'GetSceneList') return { scenes: this.sceneList.map((sceneName) => ({ sceneName })) } as T;
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
