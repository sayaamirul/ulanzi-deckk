import type { IpcMain } from 'electron';
import type { AppSnapshot, Runtime } from './runtime';
import type { Profile } from '../domain/profile/types';
import type { ObsSettings } from '../actions/obs/adapter';
import type { AppPreferences, PreferencesStore } from './preferences';

export const IPC_METHODS = [
  'getSnapshot',
  'listProfiles',
  'selectProfile',
  'createProfile',
  'saveProfile',
  'selectPage',
  'dispatchSlot',
  'connectObs',
  'getObsScenes',
  'setBrightness',
  'getPreferences',
  'savePreferences',
] as const;

export type UlanziApi = {
  getSnapshot(): Promise<AppSnapshot>;
  onSnapshot(listener: (snapshot: AppSnapshot) => void): () => void;
  listProfiles(): Promise<Array<{ id: string; name: string }>>;
  selectProfile(profileId: string): Promise<void>;
  createProfile(input: { name: string; duplicateFromId?: string }): Promise<void>;
  saveProfile(profile: Profile): Promise<void>;
  selectPage(pageId: string): Promise<void>;
  dispatchSlot(slotId: string): Promise<void>;
  connectObs(settings: ObsSettings): Promise<void>;
  getObsScenes(): Promise<string[]>;
  setBrightness(value: number): Promise<void>;
  getPreferences(): Promise<AppPreferences>;
  savePreferences(preferences: AppPreferences): Promise<void>;
};

export const registerIpc = (
  runtime: Runtime,
  ipc: Pick<IpcMain, 'handle'>,
  preferencesStore: PreferencesStore,
): void => {
  ipc.handle('ulanzi:getSnapshot', () => runtime.getSnapshot());
  ipc.handle('ulanzi:listProfiles', () => runtime.listProfiles());
  ipc.handle('ulanzi:selectProfile', (_event, profileId: string) => runtime.selectProfile(profileId));
  ipc.handle('ulanzi:createProfile', (_event, input: { name: string; duplicateFromId?: string }) => runtime.createProfile(input));
  ipc.handle('ulanzi:saveProfile', (_event, profile: Profile) => runtime.saveProfile(profile));
  ipc.handle('ulanzi:selectPage', (_event, pageId: string) => runtime.selectPage(pageId));
  ipc.handle('ulanzi:dispatchSlot', (_event, slotId: string) => runtime.dispatchSlot(slotId as never));
  ipc.handle('ulanzi:connectObs', (_event, settings: ObsSettings) => runtime.connectObs(settings));
  ipc.handle('ulanzi:getObsScenes', () => runtime.listObsScenes());
  ipc.handle('ulanzi:setBrightness', (_event, value: number) => runtime.setBrightness(value));
  ipc.handle('ulanzi:getPreferences', () => preferencesStore.load());
  ipc.handle('ulanzi:savePreferences', (_event, preferences: AppPreferences) => preferencesStore.save(preferences));
};
