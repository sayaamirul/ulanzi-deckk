import { Menu, Tray, nativeImage, type BrowserWindow } from 'electron';
import type { Runtime } from './runtime';

export const createTray = (window: BrowserWindow, runtime: Runtime): Tray => {
  const tray = new Tray(nativeImage.createEmpty());
  const reconnectDevice = async () => {
    await runtime.stop();
    await runtime.start();
  };
  tray.setToolTip('Ulanzi D200H OBS');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show editor', click: () => { window.show(); window.focus(); } },
    { label: 'Reconnect device', click: () => { void reconnectDevice(); } },
    { label: 'Reconnect OBS', click: () => { void runtime.connectObs({ url: 'ws://127.0.0.1:4455' }); } },
    { label: 'Quit', click: () => { window.close(); } },
  ]));
  return tray;
};
