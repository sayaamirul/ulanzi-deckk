import { describe, expect, it, vi } from 'vitest';
import type { Action } from '../../src/domain/actions/types';
import type { Profile } from '../../src/domain/profile/types';
import type { DeviceRuntimeState, ObsRuntimeState } from '../../src/domain/state/types';
import { ActionExecutor } from '../../src/actions/executor';
import { Runtime } from '../../src/main/runtime';

const streamProfileFixture: Profile = {
  version: 1,
  id: 'stream-control',
  name: 'Stream Control',
  activePageId: 'main',
  pages: [{
    id: 'main',
    name: 'Main',
    slots: {
      '0_0': { id: '0_0', label: 'Stream', action: { type: 'obs.stream.toggle' } },
    },
  }],
};

class FakeDevice {
  state: DeviceRuntimeState = { status: 'connected' };
  readonly pageCalls: unknown[][] = [];
  readonly calls: Array<{ method: string; slots?: unknown[] }> = [];
  private buttonListener?: (event: { index: number; pressed: boolean }) => void;
  private stateListener?: (state: DeviceRuntimeState) => void;

  async start(): Promise<void> { this.calls.push({ method: 'start' }); }
  async stop(): Promise<void> {}
  getState(): DeviceRuntimeState { return this.state; }
  onButton(listener: (event: { index: number; pressed: boolean }) => void): () => void { this.buttonListener = listener; return () => undefined; }
  onState(listener: (state: DeviceRuntimeState) => void): () => void { this.stateListener = listener; return () => undefined; }
  async setPage(slots: unknown[]): Promise<void> {
    this.pageCalls.push(slots);
    this.calls.push({ method: 'setPage', slots });
  }
  async updateSlots(slots: unknown[]): Promise<void> { this.pageCalls.push(slots); }
  async setBrightness(): Promise<void> { throw new Error('D200H HID brightness is not verified'); }
  emitButton(index: number, pressed: boolean): void { this.buttonListener?.({ index, pressed }); }
  emitState(state: DeviceRuntimeState): void { this.state = state; this.stateListener?.(state); }
}

class FakeObs {
  state: ObsRuntimeState = { connected: true, streaming: false, recording: false, replayBuffer: false, mutedInputs: {} };
  readonly calls: Action[] = [];
  private stateListener?: (state: ObsRuntimeState) => void;

  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  getState(): ObsRuntimeState { return this.state; }
  onState(listener: (state: ObsRuntimeState) => void): () => void { this.stateListener = listener; return () => undefined; }
  async execute(action: Extract<Action, { type: `obs.${string}` }>): Promise<void> { this.calls.push(action); }
  emitState(state: ObsRuntimeState): void { this.state = state; this.stateListener?.(state); }
}

const createRuntimeWithFakes = (profile: Profile) => {
  const device = new FakeDevice();
  const obs = new FakeObs();
  const system = {
    launch: vi.fn(async () => undefined),
    open: vi.fn(async () => undefined),
    shortcut: vi.fn(async () => undefined),
    shell: vi.fn(async () => undefined),
  };
  const runtime = new Runtime({
    profile,
    profileStore: { save: vi.fn(async () => undefined) },
    device,
    obs,
    executor: new ActionExecutor(obs, system),
  });
  return { runtime, fakes: { device, obs } };
};

describe('runtime', () => {
  it('supplies the initial page before starting device discovery', async () => {
    const { runtime, fakes } = createRuntimeWithFakes(streamProfileFixture);

    await runtime.start();

    expect(fakes.device.calls.slice(0, 2)).toEqual([
      { method: 'setPage', slots: expect.any(Array) },
      { method: 'start' },
    ]);
    expect(fakes.device.pageCalls).toHaveLength(1);
  });

  it('routes a fake device press through the active profile to OBS', async () => {
    const { runtime, fakes } = createRuntimeWithFakes(streamProfileFixture);
    await runtime.start();

    fakes.device.emitButton(0, true);

    expect(fakes.obs.calls).toContainEqual({ type: 'obs.stream.toggle' });
  });

  it('keeps the last valid profile after a malformed save', async () => {
    const { runtime } = createRuntimeWithFakes(streamProfileFixture);

    await expect(runtime.saveProfile({ version: 1 })).rejects.toThrow();
    expect(runtime.getSnapshot().profile.name).toBe('Stream Control');
  });

  it('propagates the unsupported D200H brightness error to the caller', async () => {
    const { runtime } = createRuntimeWithFakes(streamProfileFixture);

    await expect(runtime.setBrightness(80)).rejects.toThrow('D200H HID brightness is not verified');
  });

  it('publishes updated state snapshots', async () => {
    const { runtime, fakes } = createRuntimeWithFakes(streamProfileFixture);
    const snapshots: string[] = [];
    runtime.onSnapshot((snapshot) => snapshots.push(snapshot.obs.connected ? 'obs-connected' : 'obs-disconnected'));
    await runtime.start();

    fakes.obs.emitState({ ...fakes.obs.state, streaming: true });

    expect(snapshots).toContain('obs-connected');
    expect(runtime.getSnapshot().renderedPage.slots['0_0'].visual).toBe('inactive');
  });

  it('opens a folder and returns to its parent through page actions', async () => {
    const profile: Profile = {
      ...streamProfileFixture,
      pages: [
        {
          id: 'main',
          name: 'Main',
          slots: {
            '0_0': { id: '0_0', label: 'Apps', action: { type: 'page.goto', pageId: 'apps' } },
          },
        },
        {
          id: 'apps',
          name: 'Apps',
          kind: 'folder',
          parentPageId: 'main',
          slots: {
            '0_1': { id: '0_1', label: 'Back', action: { type: 'page.back' } },
          },
        },
      ],
    };
    const { runtime, fakes } = createRuntimeWithFakes(profile);
    await runtime.start();

    await runtime.dispatchSlot('0_0');
    expect(runtime.getSnapshot().activePageId).toBe('apps');
    expect(fakes.device.pageCalls).toHaveLength(2);

    await runtime.dispatchSlot('0_1');
    expect(runtime.getSnapshot().activePageId).toBe('main');
    expect(fakes.device.pageCalls).toHaveLength(3);
  });

  it('rejects opening a folder from a page that is not its parent', async () => {
    const profile: Profile = {
      ...streamProfileFixture,
      activePageId: 'other',
      pages: [
        { id: 'main', name: 'Main', slots: {} },
        {
          id: 'other',
          name: 'Other',
          slots: {
            '0_0': { id: '0_0', label: 'Apps', action: { type: 'page.goto', pageId: 'apps' } },
          },
        },
        { id: 'apps', name: 'Apps', kind: 'folder', parentPageId: 'main', slots: {} },
      ],
    };
    const { runtime, fakes } = createRuntimeWithFakes(profile);
    await runtime.start();

    await runtime.dispatchSlot('0_0');

    expect(runtime.getSnapshot().activePageId).toBe('other');
    expect(fakes.device.pageCalls).toHaveLength(1);
    expect(runtime.getSnapshot().lastError?.message).toMatch(/folder parent must match/i);
  });

  it('keeps normal-page Back navigation on the previous top-level page', async () => {
    const profile: Profile = {
      ...streamProfileFixture,
      activePageId: 'other',
      pages: [
        { id: 'main', name: 'Main', slots: {} },
        { id: 'apps', name: 'Apps', kind: 'folder', parentPageId: 'main', slots: {} },
        { id: 'other', name: 'Other', slots: { '0_0': { id: '0_0', label: 'Back', action: { type: 'page.back' } } } },
      ],
    };
    const { runtime } = createRuntimeWithFakes(profile);
    await runtime.start();

    await runtime.dispatchSlot('0_0');

    expect(runtime.getSnapshot().activePageId).toBe('main');
  });
});
