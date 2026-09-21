import { contextBridge, ipcRenderer } from 'electron';
import type { UlanziApi } from '../main/ipc';

const api: UlanziApi = {
  getSnapshot: () => ipcRenderer.invoke('ulanzi:getSnapshot'),
  onSnapshot: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, snapshot: Parameters<typeof listener>[0]) => listener(snapshot);
    ipcRenderer.on('ulanzi:snapshot', handler);
    return () => ipcRenderer.removeListener('ulanzi:snapshot', handler);
  },
  listProfiles: () => ipcRenderer.invoke('ulanzi:listProfiles'),
  selectProfile: (profileId) => ipcRenderer.invoke('ulanzi:selectProfile', profileId),
  createProfile: (input) => ipcRenderer.invoke('ulanzi:createProfile', input),
  saveProfile: (profile) => ipcRenderer.invoke('ulanzi:saveProfile', profile),
  selectPage: (pageId) => ipcRenderer.invoke('ulanzi:selectPage', pageId),
  dispatchSlot: (slotId) => ipcRenderer.invoke('ulanzi:dispatchSlot', slotId),
  connectObs: (settings) => ipcRenderer.invoke('ulanzi:connectObs', settings),
  getObsScenes: () => ipcRenderer.invoke('ulanzi:getObsScenes'),
  setBrightness: (value) => ipcRenderer.invoke('ulanzi:setBrightness', value),
  getPreferences: () => ipcRenderer.invoke('ulanzi:getPreferences'),
  savePreferences: (preferences) => ipcRenderer.invoke('ulanzi:savePreferences', preferences),
};

contextBridge.exposeInMainWorld('ulanzi', api);
