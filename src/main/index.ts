import { app, BrowserWindow, ipcMain, type Tray } from 'electron';
import { join } from 'node:path';
import { ActionExecutor } from '../actions/executor';
import { ObsAdapter } from '../actions/obs/adapter';
import { ObsWebSocketClient } from '../actions/obs/client';
import { LinuxSystemActionAdapter } from '../actions/system/adapter';
import { DeviceManager } from '../device/device-manager';
import { NodeHidTransport } from '../device/node-hid-transport';
import { createFileProfileStore, loadInitialProfile } from './config';
import { registerIpc } from './ipc';
import { Runtime } from './runtime';
import { createTray } from './tray';

const createWindow = (): BrowserWindow => {
  const window = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 900,
    minHeight: 640,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return window;
};

let appTray: Tray | undefined;

app.whenReady().then(async () => {
  const window = createWindow();
  const profile = await loadInitialProfile();
  const profileStore = await createFileProfileStore();
  const device = new DeviceManager({
    list: () => NodeHidTransport.list(),
    open: (descriptor) => NodeHidTransport.open(descriptor),
  });
  const obs = new ObsAdapter(new ObsWebSocketClient());
  const runtime = new Runtime({
    profile,
    profileStore,
    device,
    obs,
    executor: new ActionExecutor(obs, new LinuxSystemActionAdapter()),
  });

  registerIpc(runtime, ipcMain);
  runtime.onSnapshot((snapshot) => {
    if (!window.isDestroyed()) window.webContents.send('ulanzi:snapshot', snapshot);
  });
  appTray = createTray(window, runtime);
  await runtime.start();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
