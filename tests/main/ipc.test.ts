import { describe, expect, it } from 'vitest';
import { IPC_METHODS } from '../../src/main/ipc';

describe('IPC contract', () => {
  it('exposes only the typed application methods', () => {
    expect(IPC_METHODS).toEqual([
      'getSnapshot',
      'saveProfile',
      'selectPage',
      'dispatchSlot',
      'connectObs',
      'setBrightness',
      'getPreferences',
      'savePreferences',
    ]);
  });
});
