import { describe, expect, it, vi } from 'vitest';
import type { Action } from '../../src/domain/actions/types';
import type { Profile, ProfileSummary } from '../../src/domain/profile/types';
import type { DeviceRuntimeState, ObsRuntimeState } from '../../src/domain/state/types';
import { ActionExecutor } from '../../src/actions/executor';
import { Runtime } from '../../src/main/runtime';
import type { AppPreferences } from '../../src/main/preferences';

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

class FakeProfileCatalog {
  readonly profiles = new Map<string, Profile>();
  readonly reservedIds = new Set<string>();
  readonly saves: Profile[] = [];

  async listIds(): Promise<string[]> {
    return [...new Set([...this.profiles.keys(), ...this.reservedIds])].sort();
  }

  async list(): Promise<ProfileSummary[]> {
    return [...this.profiles.values()]
      .map((profile) => ({ id: profile.id, name: profile.name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async load(id: string): Promise<Profile> {
    const profile = this.profiles.get(id);
    if (!profile) throw new Error(`Profile not found: ${id}`);
    return structuredClone(profile);
  }

  async save(profile: Profile): Promise<void> {
    const copy = structuredClone(profile);
    this.profiles.set(copy.id, copy);
    this.saves.push(copy);
  }

  async remove(id: string): Promise<void> {
    this.profiles.delete(id);
  }
}

class FakePreferences {
  value: AppPreferences = { theme: 'dark' };
  readonly saves: AppPreferences[] = [];
  failSaves = false;

  async load(): Promise<AppPreferences> { return { ...this.value }; }
  async save(value: AppPreferences): Promise<void> {
    if (this.failSaves) throw new Error('preferences unavailable');
    this.value = { ...value };
    this.saves.push({ ...value });
  }
}

const createRuntimeWithFakes = (profile: Profile) => {
  const device = new FakeDevice();
  const obs = new FakeObs();
  const profileCatalog = new FakeProfileCatalog();
  profileCatalog.profiles.set(profile.id, structuredClone(profile));
  const preferences = new FakePreferences();
  const system = {
    launch: vi.fn(async () => undefined),
    open: vi.fn(async () => undefined),
    shortcut: vi.fn(async () => undefined),
    shell: vi.fn(async () => undefined),
  };
  const runtime = new Runtime({
    profile,
    profileStore: profileCatalog,
    preferencesStore: preferences,
    device,
    obs,
    executor: new ActionExecutor(obs, system),
  });
  return { runtime, fakes: { device, obs, profileCatalog, preferences } };
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

  it('includes the profile catalog and active profile in startup snapshots', async () => {
    const { runtime, fakes } = createRuntimeWithFakes(streamProfileFixture);
    const secondProfile = { ...streamProfileFixture, id: 'studio', name: 'Studio' };
    fakes.profileCatalog.profiles.set(secondProfile.id, secondProfile);

    await runtime.start();

    expect(runtime.getSnapshot().activeProfileId).toBe('stream-control');
    expect(runtime.getSnapshot().profiles).toEqual([
      { id: 'stream-control', name: 'Stream Control' },
      { id: 'studio', name: 'Studio' },
    ]);
  });

  it('switches profiles only after loading the target and persists the active id', async () => {
    const { runtime, fakes } = createRuntimeWithFakes(streamProfileFixture);
    const studio: Profile = {
      ...streamProfileFixture,
      id: 'studio',
      name: 'Studio',
      activePageId: 'studio-page',
      pages: [{ id: 'studio-page', name: 'Studio page', slots: {} }],
    };
    fakes.profileCatalog.profiles.set(studio.id, studio);
    const snapshots: string[] = [];
    runtime.onSnapshot((snapshot) => snapshots.push(snapshot.activeProfileId));
    await runtime.start();

    await runtime.selectProfile('studio');

    expect(runtime.getSnapshot().profile).toEqual(studio);
    expect(runtime.getSnapshot().activeProfileId).toBe('studio');
    expect(runtime.getSnapshot().activePageId).toBe('studio-page');
    expect(fakes.device.pageCalls).toHaveLength(2);
    expect(fakes.preferences.value).toEqual({ theme: 'dark', activeProfileId: 'studio' });
    expect(fakes.preferences.saves.at(-1)).toEqual({ theme: 'dark', activeProfileId: 'studio' });
    expect(snapshots).toContain('studio');
  });

  it('rolls back a profile switch when preference persistence fails', async () => {
    const { runtime, fakes } = createRuntimeWithFakes(streamProfileFixture);
    const studio = { ...streamProfileFixture, id: 'studio', name: 'Studio' };
    fakes.profileCatalog.profiles.set(studio.id, studio);
    await runtime.start();
    fakes.preferences.failSaves = true;

    await expect(runtime.selectProfile('studio')).rejects.toThrow(/preferences unavailable/i);

    expect(runtime.getSnapshot().activeProfileId).toBe('stream-control');
    expect(runtime.getSnapshot().profile.name).toBe('Stream Control');
  });

  it('removes a newly created profile when activation fails', async () => {
    const { runtime, fakes } = createRuntimeWithFakes(streamProfileFixture);
    await runtime.start();
    fakes.preferences.failSaves = true;

    await expect(runtime.createProfile({ name: 'Ghost' })).rejects.toThrow(/preferences unavailable/i);

    expect(fakes.profileCatalog.profiles.has('ghost')).toBe(false);
    expect(runtime.getSnapshot().activeProfileId).toBe('stream-control');
  });

  it('does not require a redundant preference write for an ordinary save', async () => {
    const { runtime, fakes } = createRuntimeWithFakes(streamProfileFixture);
    await runtime.start();
    fakes.preferences.failSaves = true;

    await runtime.saveProfile({ ...streamProfileFixture, name: 'Renamed' });

    expect(runtime.getSnapshot().profile.name).toBe('Renamed');
  });

  it('creates fresh and duplicated profiles with isolated pages and slots', async () => {
    const { runtime, fakes } = createRuntimeWithFakes(streamProfileFixture);
    await runtime.start();

    await runtime.createProfile({ name: '  New Layout  ' });
    const fresh = runtime.getSnapshot().profile;
    expect(fresh.name).toBe('New Layout');
    expect(fresh.id).toBe('new-layout');
    expect(fakes.profileCatalog.saves.at(-1)?.id).toBe('new-layout');

    await runtime.selectProfile('stream-control');
    await runtime.createProfile({ name: 'Studio Copy', duplicateFromId: 'stream-control' });
    const duplicate = runtime.getSnapshot().profile;
    expect(duplicate.name).toBe('Studio Copy');
    expect(duplicate.id).toBe('studio-copy');
    expect(duplicate.pages).toEqual(streamProfileFixture.pages);
    expect(duplicate.pages).not.toBe(streamProfileFixture.pages);
    expect(duplicate.pages[0].slots).not.toBe(streamProfileFixture.pages[0].slots);
  });

  it('does not reuse an id reserved by a malformed profile file', async () => {
    const { runtime, fakes } = createRuntimeWithFakes(streamProfileFixture);
    fakes.profileCatalog.reservedIds.add('studio');
    await runtime.start();

    await runtime.createProfile({ name: 'Studio' });

    expect(runtime.getSnapshot().activeProfileId).toBe('studio-2');
    expect(fakes.profileCatalog.saves.at(-1)?.id).toBe('studio-2');
  });

  it('rejects invalid names and missing profile ids without replacing the current profile', async () => {
    const { runtime } = createRuntimeWithFakes(streamProfileFixture);
    await runtime.start();

    await expect(runtime.createProfile({ name: '   ' })).rejects.toThrow(/name/i);
    await expect(runtime.selectProfile('missing')).rejects.toThrow(/profile/i);
    expect(runtime.getSnapshot().activeProfileId).toBe('stream-control');
    expect(runtime.getSnapshot().profile.name).toBe('Stream Control');
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
