import type { Action } from '../domain/actions/types';
import { parseProfile } from '../domain/profile/schema';
import { isFolderPage, topLevelPages } from '../domain/profile/navigation';
import { CONFIGURABLE_SLOT_IDS } from '../domain/profile/types';
import type { Profile, RenderedPage } from '../domain/profile/types';
import { ProfileEngine } from '../domain/profile/engine';
import type { DeviceRuntimeState, ObsRuntimeState } from '../domain/state/types';
import type { ObsSettings } from '../actions/obs/adapter';
import type { ActionExecutor } from '../actions/executor';
import { createDefaultProfile } from './config';
import { createProfileId } from './profile-catalog';
import type { ProfileCatalogStore } from './profile-catalog';
import type { AppPreferences, PreferencesStore } from './preferences';

export type RuntimeDevicePort = {
  start(): Promise<void>;
  stop(): Promise<void>;
  getState(): DeviceRuntimeState;
  onButton(listener: (event: { index: number; pressed: boolean }) => void): () => void;
  onState(listener: (state: DeviceRuntimeState) => void): () => void;
  setPage(slots: RenderedPage['slots'][keyof RenderedPage['slots']][]): Promise<void>;
  updateSlots(slots: RenderedPage['slots'][keyof RenderedPage['slots']][]): Promise<void>;
  setBrightness(value: number): Promise<void>;
};

export type RuntimeObsPort = {
  connect(settings: ObsSettings): Promise<void>;
  disconnect(): Promise<void>;
  listScenes(): Promise<string[]>;
  getState(): ObsRuntimeState;
  onState(listener: (state: ObsRuntimeState) => void): () => void;
  execute(action: Extract<Action, { type: `obs.${string}` }>): Promise<void>;
};

export type AppSnapshot = {
  profile: Profile;
  profiles: Array<{ id: string; name: string }>;
  activeProfileId: string;
  activePageId: string;
  renderedPage: RenderedPage;
  device: DeviceRuntimeState;
  obs: ObsRuntimeState;
  lastError?: { code: string; message: string };
};

export type RuntimeDependencies = {
  profile: Profile;
  profileStore: ProfileCatalogStore;
  preferencesStore: PreferencesStore;
  device: RuntimeDevicePort;
  obs: RuntimeObsPort;
  executor: ActionExecutor;
};

type SnapshotListener = (snapshot: AppSnapshot) => void;

export class Runtime {
  private profile: Profile;
  private profiles: Array<{ id: string; name: string }> = [];
  private activePageId: string;
  private readonly profileStore: ProfileCatalogStore;
  private readonly preferencesStore: PreferencesStore;
  private readonly device: RuntimeDevicePort;
  private readonly obs: RuntimeObsPort;
  private readonly executor: ActionExecutor;
  private readonly engine = new ProfileEngine();
  private readonly listeners = new Set<SnapshotListener>();
  private unsubscribers: Array<() => void> = [];
  private lastError?: { code: string; message: string };

  constructor(dependencies: RuntimeDependencies) {
    this.profile = dependencies.profile;
    this.profiles = [{ id: dependencies.profile.id, name: dependencies.profile.name }];
    this.activePageId = dependencies.profile.activePageId;
    this.profileStore = dependencies.profileStore;
    this.preferencesStore = dependencies.preferencesStore;
    this.device = dependencies.device;
    this.obs = dependencies.obs;
    this.executor = dependencies.executor;
    this.executor.setPageNavigator(async (action) => this.navigate(action));
  }

  async start(): Promise<void> {
    await this.refreshProfiles();
    this.unsubscribers.push(
      this.device.onButton((event) => { void this.handleButton(event); }),
      this.device.onState(() => this.publish()),
      this.obs.onState(() => this.publish()),
    );
    const rendered = this.getSnapshot().renderedPage;
    await this.device.setPage(Object.values(rendered.slots));
    await this.device.start();
    this.publish();
  }

  async stop(): Promise<void> {
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.unsubscribers = [];
    await this.device.stop();
  }

  getSnapshot(): AppSnapshot {
    const state = { obs: this.obs.getState(), device: this.device.getState() };
    return {
      profile: structuredClone(this.profile),
      profiles: structuredClone(this.profiles),
      activeProfileId: this.profile.id,
      activePageId: this.activePageId,
      renderedPage: this.engine.renderPage(this.profile, this.activePageId, state),
      device: state.device,
      obs: state.obs,
      ...(this.lastError ? { lastError: this.lastError } : {}),
    };
  }

  onSnapshot(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async saveProfile(input: unknown): Promise<void> {
    const profile = parseProfile(input);
    const previousProfileId = this.profile.id;
    await this.profileStore.save(profile);
    this.profile = profile;
    this.activePageId = profile.activePageId;
    await this.refreshProfiles();
    if (profile.id !== previousProfileId) await this.persistActiveProfileId(profile.id);
    this.lastError = undefined;
    await this.pushPage();
    this.publish();
  }

  async listProfiles(): Promise<Array<{ id: string; name: string }>> {
    await this.refreshProfiles();
    return structuredClone(this.profiles);
  }

  async selectProfile(profileId: string): Promise<void> {
    const nextProfile = await this.profileStore.load(profileId);
    await this.refreshProfiles();
    const previousProfile = this.profile;
    const previousPageId = this.activePageId;
    this.profile = structuredClone(nextProfile);
    this.activePageId = nextProfile.activePageId;
    try {
      await this.pushPage();
      await this.persistActiveProfileId(nextProfile.id);
    } catch (error) {
      this.profile = previousProfile;
      this.activePageId = previousPageId;
      await this.pushPage();
      throw error;
    }
    this.lastError = undefined;
    this.publish();
  }

  async createProfile(input: { name: string; duplicateFromId?: string }): Promise<void> {
    const name = input.name.trim();
    if (!name) throw new Error('Profile name is required');

    await this.refreshProfiles();
    const id = createProfileId(name, await this.profileStore.listIds());
    const source = input.duplicateFromId
      ? await this.profileStore.load(input.duplicateFromId)
      : createDefaultProfile();
    const profile: Profile = {
      ...structuredClone(source),
      id,
      name,
    };
    await this.profileStore.save(profile);
    await this.refreshProfiles();
    try {
      await this.selectProfile(id);
    } catch (error) {
      try {
        await this.profileStore.remove(id);
      } finally {
        await this.refreshProfiles();
      }
      throw error;
    }
  }

  async selectPage(pageId: string): Promise<void> {
    if (!this.profile.pages.some((page) => page.id === pageId)) throw new Error(`Page not found: ${pageId}`);
    this.activePageId = pageId;
    await this.pushPage();
    this.publish();
  }

  async dispatchSlot(slotId: (typeof CONFIGURABLE_SLOT_IDS)[number]): Promise<void> {
    const slot = this.engine.resolveSlot(this.profile, this.activePageId, slotId);
    if (!slot) return;
    await this.executeAction(slot.action);
  }

  async connectObs(settings: ObsSettings): Promise<void> {
    try {
      await this.obs.connect(settings);
      this.lastError = undefined;
      this.publish();
    } catch (error) {
      this.lastError = { code: 'obs_connection_failed', message: error instanceof Error ? error.message : String(error) };
      this.publish();
      throw error;
    }
  }

  async listObsScenes(): Promise<string[]> {
    return this.obs.listScenes();
  }

  async setBrightness(value: number): Promise<void> {
    await this.device.setBrightness(value);
  }

  private async handleButton(event: { index: number; pressed: boolean }): Promise<void> {
    if (!event.pressed || event.index < 0 || event.index >= CONFIGURABLE_SLOT_IDS.length) return;
    await this.dispatchSlot(CONFIGURABLE_SLOT_IDS[event.index]);
  }

  private async executeAction(action: Action): Promise<void> {
    try {
      await this.executor.execute(action);
      this.lastError = undefined;
      this.publish();
    } catch (error) {
      this.lastError = { code: 'action_failed', message: error instanceof Error ? error.message : String(error) };
      this.publish();
    }
  }

  private async navigate(action: Extract<Action, { type: `page.${string}` }>): Promise<void> {
    const currentPage = this.profile.pages.find((page) => page.id === this.activePageId);
    if (!currentPage) throw new Error(`Page not found: ${this.activePageId}`);

    if (action.type === 'page.goto') {
      const targetPage = this.profile.pages.find((page) => page.id === action.pageId);
      if (!targetPage) throw new Error(`Page not found: ${action.pageId}`);
      if (isFolderPage(targetPage) && targetPage.parentPageId !== currentPage.id) {
        throw new Error(`folder parent must match current page: ${currentPage.id}`);
      }
      await this.selectPage(action.pageId);
      return;
    }

    if (isFolderPage(currentPage) && currentPage.parentPageId) {
      await this.selectPage(currentPage.parentPageId);
      return;
    }

    const pages = topLevelPages(this.profile);
    const currentIndex = pages.findIndex((page) => page.id === this.activePageId);
    const previousPage = pages[Math.max(0, currentIndex - 1)];
    if (previousPage) await this.selectPage(previousPage.id);
  }

  private async pushPage(): Promise<void> {
    const rendered = this.getSnapshot().renderedPage;
    await this.device.setPage(Object.values(rendered.slots));
  }

  private async refreshProfiles(): Promise<void> {
    const profiles = await this.profileStore.list();
    this.profiles = profiles
      .map((profile) => ({ id: profile.id, name: profile.name }))
      .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
  }

  private async persistActiveProfileId(activeProfileId: string): Promise<void> {
    const preferences: AppPreferences = await this.preferencesStore.load();
    await this.preferencesStore.save({ ...preferences, activeProfileId });
  }

  private publish(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}
