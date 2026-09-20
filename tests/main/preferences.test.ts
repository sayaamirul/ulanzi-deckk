import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_APP_PREFERENCES,
  FilePreferencesStore,
  normalizePreferences,
} from '../../src/main/preferences';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('application preferences', () => {
  it('normalizes missing and unsupported values to Auto', () => {
    expect(normalizePreferences(undefined)).toEqual(DEFAULT_APP_PREFERENCES);
    expect(normalizePreferences({ theme: 'light' })).toEqual({ theme: 'light' });
    expect(normalizePreferences({ theme: 'unknown' })).toEqual(DEFAULT_APP_PREFERENCES);
    expect(normalizePreferences({ theme: 'dark', activeProfileId: 'studio' })).toEqual({ theme: 'dark', activeProfileId: 'studio' });
    expect(normalizePreferences({ theme: 'dark', activeProfileId: '  ' })).toEqual({ theme: 'dark' });
  });

  it('loads Auto when the preferences file does not exist', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ulanzi-preferences-'));
    temporaryDirectories.push(directory);
    const store = new FilePreferencesStore(join(directory, 'preferences.json'));

    await expect(store.load()).resolves.toEqual(DEFAULT_APP_PREFERENCES);
  });

  it('round-trips valid preferences and creates the parent directory', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ulanzi-preferences-'));
    temporaryDirectories.push(directory);
    const path = join(directory, 'nested', 'preferences.json');
    const store = new FilePreferencesStore(path);

    await store.save({ theme: 'dark' });

    await expect(readFile(path, 'utf8')).resolves.toContain('"theme": "dark"');
    await expect(store.load()).resolves.toEqual({ theme: 'dark' });
  });

  it('falls back to Auto for malformed JSON', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ulanzi-preferences-'));
    temporaryDirectories.push(directory);
    const path = join(directory, 'preferences.json');
    await writeFile(path, '{not-json', 'utf8');
    const store = new FilePreferencesStore(path);

    await expect(store.load()).resolves.toEqual(DEFAULT_APP_PREFERENCES);
  });

  it('serializes overlapping saves and persists the latest invocation', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ulanzi-preferences-'));
    temporaryDirectories.push(directory);
    const store = new FilePreferencesStore(join(directory, 'preferences.json'));

    await Promise.all([
      store.save({ theme: 'light' }),
      store.save({ theme: 'dark' }),
      store.save({ theme: 'system' }),
    ]);

    await expect(store.load()).resolves.toEqual({ theme: 'system' });
  });
});
