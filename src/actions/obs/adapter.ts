import type { Action } from '../../domain/actions/types';
import type { ObsRuntimeState } from '../../domain/state/types';
import type { ObsClient, ObsEvent, ObsRequest } from './client';

export type ObsSettings = { url: string; password?: string };
export type ObsStateListener = (state: ObsRuntimeState) => void;

const initialState = (): ObsRuntimeState => ({
  connected: false,
  streaming: false,
  recording: false,
  replayBuffer: false,
  mutedInputs: {},
});

export class ObsAdapter {
  private state = initialState();
  private unsubscribeEvents?: () => void;
  private readonly listeners = new Set<ObsStateListener>();

  constructor(private readonly client: ObsClient) {}

  async connect(settings: ObsSettings): Promise<void> {
    let clientConnected = false;
    try {
      await this.client.connect(settings.url, settings.password);
      clientConnected = true;
      this.unsubscribeEvents = this.client.onEvent((event) => this.handleEvent(event));
      this.state = { ...this.state, connected: true };
      await this.refreshState();
      this.emitState();
    } catch (error) {
      this.unsubscribeEvents?.();
      this.unsubscribeEvents = undefined;
      if (clientConnected) {
        try {
          await this.client.disconnect();
        } catch {
          // Preserve the original connection error for the caller.
        }
      }
      this.state = initialState();
      this.emitState();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.unsubscribeEvents?.();
    this.unsubscribeEvents = undefined;
    await this.client.disconnect();
    this.state = { ...initialState() };
    this.emitState();
  }

  async listScenes(): Promise<string[]> {
    if (!this.state.connected) throw new Error('OBS is not connected');
    const response = await this.request<{ scenes?: Array<{ sceneName?: unknown }> }>({ requestType: 'GetSceneList' });
    return [...new Set((response.scenes ?? []).flatMap((scene) => typeof scene.sceneName === 'string' ? [scene.sceneName] : []))];
  }

  getState(): ObsRuntimeState {
    return { ...this.state, mutedInputs: { ...this.state.mutedInputs } };
  }

  onState(listener: ObsStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async execute(action: Extract<Action, { type: `obs.${string}` }>): Promise<void> {
    if (!this.state.connected) throw new Error('OBS is not connected');

    switch (action.type) {
      case 'obs.scene.set':
        await this.request({ requestType: 'SetCurrentProgramScene', requestData: { sceneName: action.sceneName } });
        return;
      case 'obs.source.visibility.toggle': {
        const list = await this.request<{ sceneItems?: Array<{ sourceName?: string; sceneItemId?: number }> }>({
          requestType: 'GetSceneItemList', requestData: { sceneName: action.sceneName },
        });
        const item = list.sceneItems?.find((candidate) => candidate.sourceName === action.sourceName);
        if (item?.sceneItemId === undefined) throw new Error(`OBS source not found: ${action.sourceName}`);
        const current = await this.request<{ sceneItemEnabled?: boolean }>({
          requestType: 'GetSceneItemEnabled',
          requestData: { sceneName: action.sceneName, sceneItemId: item.sceneItemId },
        });
        await this.request({
          requestType: 'SetSceneItemEnabled',
          requestData: { sceneName: action.sceneName, sceneItemId: item.sceneItemId, sceneItemEnabled: !current.sceneItemEnabled },
        });
        return;
      }
      case 'obs.stream.toggle':
        await this.request({ requestType: this.state.streaming ? 'StopStream' : 'StartStream' });
        return;
      case 'obs.record.toggle':
        await this.request({ requestType: this.state.recording ? 'StopRecord' : 'StartRecord' });
        return;
      case 'obs.replay.toggle':
        await this.request({ requestType: this.state.replayBuffer ? 'StopReplayBuffer' : 'StartReplayBuffer' });
        return;
      case 'obs.input.mute.toggle': {
        const current = await this.request<{ inputMuted?: boolean }>({
          requestType: 'GetInputMute', requestData: { inputName: action.inputName },
        });
        await this.request({
          requestType: 'SetInputMute',
          requestData: { inputName: action.inputName, inputMuted: !current.inputMuted },
        });
        return;
      }
      case 'obs.transition.trigger':
        if (action.transitionName) {
          await this.request({ requestType: 'SetCurrentSceneTransition', requestData: { transitionName: action.transitionName } });
        }
        await this.request({ requestType: 'TriggerStudioModeTransition' });
        return;
      default:
        throw new Error(`Unsupported OBS action: ${(action as Action).type}`);
    }
  }

  private async refreshState(): Promise<void> {
    const [scene, stream, record, replay] = await Promise.all([
      this.request<{ currentProgramSceneName?: string }>({ requestType: 'GetCurrentProgramScene' }),
      this.request<{ outputActive?: boolean }>({ requestType: 'GetStreamStatus' }),
      this.request<{ outputActive?: boolean }>({ requestType: 'GetRecordStatus' }),
      this.request<{ outputActive?: boolean }>({ requestType: 'GetReplayBufferStatus' }).catch((error: unknown) => {
        if (isReplayBufferUnavailableError(error)) return { outputActive: false };
        throw error;
      }),
    ]);
    this.state = {
      ...this.state,
      currentScene: scene.currentProgramSceneName,
      streaming: sceneBoolean(stream.outputActive),
      recording: sceneBoolean(record.outputActive),
      replayBuffer: sceneBoolean(replay.outputActive),
    };
  }

  private async request<T>(request: ObsRequest): Promise<T> {
    return this.client.request<T>(request);
  }

  private handleEvent(event: ObsEvent): void {
    const data = event.eventData;
    switch (event.eventType) {
      case 'CurrentProgramSceneChanged':
        this.state = { ...this.state, currentScene: stringValue(data.sceneName) };
        break;
      case 'StreamStateChanged':
        this.state = { ...this.state, streaming: sceneBoolean(data.outputActive) };
        break;
      case 'RecordStateChanged':
        this.state = { ...this.state, recording: sceneBoolean(data.outputActive) };
        break;
      case 'ReplayBufferStateChanged':
        this.state = { ...this.state, replayBuffer: sceneBoolean(data.outputActive) };
        break;
      case 'InputMuteStateChanged': {
        const inputName = stringValue(data.inputName);
        if (inputName) this.state = { ...this.state, mutedInputs: { ...this.state.mutedInputs, [inputName]: sceneBoolean(data.inputMuted) } };
        break;
      }
    }
    this.emitState();
  }

  private emitState(): void {
    const state = this.getState();
    for (const listener of this.listeners) listener(state);
  }
}

const sceneBoolean = (value: unknown): boolean => value === true;
const stringValue = (value: unknown): string | undefined => typeof value === 'string' ? value : undefined;

const isReplayBufferUnavailableError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  const code = 'code' in error ? (error as { code?: unknown }).code : undefined;
  const message = 'message' in error ? (error as { message?: unknown }).message : undefined;
  return code === 604 || (typeof message === 'string' && /replay buffer is not available/i.test(message));
};
