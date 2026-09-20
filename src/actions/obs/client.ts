import OBSWebSocket from 'obs-websocket-js';

export type ObsRequest = {
  requestType: string;
  requestData?: Record<string, unknown>;
};

export type ObsEvent = {
  eventType: string;
  eventData: Record<string, unknown>;
};

export type ObsClient = {
  connect(url: string, password?: string): Promise<void>;
  disconnect(): Promise<void>;
  request<T>(request: ObsRequest): Promise<T>;
  onEvent(listener: (event: ObsEvent) => void): () => void;
};

const EVENT_NAMES = [
  'CurrentProgramSceneChanged',
  'StreamStateChanged',
  'RecordStateChanged',
  'ReplayBufferStateChanged',
  'InputMuteStateChanged',
] as const;

export class ObsWebSocketClient implements ObsClient {
  private readonly client = new OBSWebSocket();

  async connect(url: string, password?: string): Promise<void> {
    await this.client.connect(url, password);
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  async request<T>(request: ObsRequest): Promise<T> {
    return this.client.call(request.requestType as never, request.requestData as never) as Promise<T>;
  }

  onEvent(listener: (event: ObsEvent) => void): () => void {
    const handlers = EVENT_NAMES.map((eventType) => {
      const handler = (eventData: unknown) => listener({ eventType, eventData: (eventData ?? {}) as Record<string, unknown> });
      this.client.on(eventType, handler as never);
      return { eventType, handler };
    });

    return () => {
      for (const { eventType, handler } of handlers) this.client.off(eventType, handler as never);
    };
  }
}
