export type ObsRuntimeState = {
  connected: boolean;
  currentScene?: string;
  streaming: boolean;
  recording: boolean;
  replayBuffer: boolean;
  mutedInputs: Record<string, boolean>;
};

export type DeviceRuntimeState = {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  message?: string;
};

export type RuntimeState = {
  obs: ObsRuntimeState;
  device: DeviceRuntimeState;
};
