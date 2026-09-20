import type { IpcMain } from 'electron';
import type { AppSnapshot, Runtime } from './runtime';
import type { Profile } from '../domain/profile/types';
import type { ObsSettings } from '../actions/obs/adapter';

export const IPC_METHODS = [
  'getSnapshot',
  'saveProfile',
  'selectPage',
  'dispatchSlot',
  'connectObs',
  'setBrightness',
] as const;

export type UlanziApi = {
  getSnapshot(): Promise<AppSnapshot>;
  onSnapshot(listener: (snapshot: AppSnapshot) => void): () => void;
  saveProfile(profile: Profile): Promise<void>;
  selectPage(pageId: string): Promise<void>;
  dispatchSlot(slotId: string): Promise<void>;
  connectObs(settings: ObsSettings): Promise<void>;
  setBrightness(value: number): Promise<void>;
};

export const registerIpc = (runtime: Runtime, ipc: Pick<IpcMain, 'handle'>): void => {
  ipc.handle('ulanzi:getSnapshot', () => runtime.getSnapshot());
  ipc.handle('ulanzi:saveProfile', (_event, profile: Profile) => runtime.saveProfile(profile));
  ipc.handle('ulanzi:selectPage', (_event, pageId: string) => runtime.selectPage(pageId));
  ipc.handle('ulanzi:dispatchSlot', (_event, slotId: string) => runtime.dispatchSlot(slotId as never));
  ipc.handle('ulanzi:connectObs', (_event, settings: ObsSettings) => runtime.connectObs(settings));
  ipc.handle('ulanzi:setBrightness', (_event, value: number) => runtime.setBrightness(value));
};
