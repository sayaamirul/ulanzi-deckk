import type { UlanziApi } from '../main/ipc';

declare global {
  interface Window {
    ulanzi: UlanziApi;
  }
}

export const ulanziApi = (): UlanziApi => window.ulanzi;
