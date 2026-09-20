import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { ProfileStore } from '../domain/profile/store';
import type { Profile } from '../domain/profile/types';
import { FilePreferencesStore } from './preferences';
import type { PreferencesStore } from './preferences';
import { FileProfileCatalogStore } from './profile-catalog';
import type { ProfileCatalogStore } from './profile-catalog';

export type RuntimeProfileStore = {
  save(profile: Profile): Promise<void>;
};

export const profileDirectory = (): string => join(
  process.env.XDG_CONFIG_HOME || join(process.env.HOME || process.cwd(), '.config'),
  'ulanzi-obs',
);

export const preferencesPath = (): string => join(profileDirectory(), 'preferences.json');

export const createDefaultProfile = (): Profile => ({
  version: 1,
  id: 'stream-control',
  name: 'Stream Control',
  activePageId: 'main',
  pages: [{
    id: 'main',
    name: 'Main',
    kind: 'normal',
    slots: {
      '0_0': { id: '0_0', label: 'Stream', action: { type: 'obs.stream.toggle' }, activeWhen: { kind: 'boolean', key: 'streaming', value: true } },
      '0_1': { id: '0_1', label: 'Record', action: { type: 'obs.record.toggle' }, activeWhen: { kind: 'boolean', key: 'recording', value: true } },
      '0_2': { id: '0_2', label: 'Replay', action: { type: 'obs.replay.toggle' }, activeWhen: { kind: 'boolean', key: 'replayBuffer', value: true } },
      '0_3': { id: '0_3', label: 'Starting Soon', action: { type: 'obs.scene.set', sceneName: 'Starting Soon' }, activeWhen: { kind: 'scene', sceneName: 'Starting Soon' } },
      '0_4': { id: '0_4', label: 'Live', action: { type: 'obs.scene.set', sceneName: 'Live' }, activeWhen: { kind: 'scene', sceneName: 'Live' } },
      '1_0': { id: '1_0', label: 'Mute mic', action: { type: 'obs.input.mute.toggle', inputName: 'Mic/Aux' } },
    },
  }],
});

export const loadInitialProfile = async (catalog?: ProfileCatalogStore, activeProfileId?: string): Promise<Profile> => {
  if (catalog) {
    if (activeProfileId) {
      try {
        return await catalog.load(activeProfileId);
      } catch {
        // Fall through to the legacy default profile below.
      }
    }
    try {
      return await catalog.load('stream-control');
    } catch {
      const profile = createDefaultProfile();
      await catalog.save(profile);
      return profile;
    }
  }

  const directory = profileDirectory();
  const path = join(directory, 'stream-control.json');
  try {
    return await new ProfileStore().load(path);
  } catch {
    return createDefaultProfile();
  }
};

export const createFileProfileStore = async (): Promise<RuntimeProfileStore> => {
  const directory = profileDirectory();
  await mkdir(directory, { recursive: true });
  const store = new ProfileStore();
  return {
    save: (profile) => store.save(join(directory, `${profile.id}.json`), profile),
  };
};

export const createFileProfileCatalogStore = async (): Promise<ProfileCatalogStore> => {
  const directory = profileDirectory();
  await mkdir(directory, { recursive: true });
  return new FileProfileCatalogStore(directory);
};

export const createFilePreferencesStore = async (): Promise<PreferencesStore> => {
  await mkdir(profileDirectory(), { recursive: true });
  return new FilePreferencesStore(preferencesPath());
};
