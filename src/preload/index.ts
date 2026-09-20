import { contextBridge, ipcRenderer } from 'electron';
import type { UlanziApi } from '../main/ipc';

const api: UlanziApi = {
  getSnapshot: () => ipcRenderer.invoke('ulanzi:getSnapshot'),
  onSnapshot: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, snapshot: Parameters<typeof listener>[0]) => listener(snapshot);
    ipcRenderer.on('ulanzi:snapshot', handler);
    return () => ipcRenderer.removeListener('ulanzi:snapshot', handler);
  },
  saveProfile: (profile) => ipcRenderer.invoke('ulanzi:saveProfile', profile),
  selectPage: (pageId) => ipcRenderer.invoke('ulanzi:selectPage', pageId),
  dispatchSlot: (slotId) => ipcRenderer.invoke('ulanzi:dispatchSlot', slotId),
  connectObs: (settings) => ipcRenderer.invoke('ulanzi:connectObs', settings),
  setBrightness: (value) => ipcRenderer.invoke('ulanzi:setBrightness', value),
};

contextBridge.exposeInMainWorld('ulanzi', api);
