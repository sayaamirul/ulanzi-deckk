import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDefaultProfile } from '../../src/main/config';
import { FileProfileCatalogStore, createProfileId } from '../../src/main/profile-catalog';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('profile catalog', () => {
  it('lists valid profiles and skips unrelated or invalid files', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ulanzi-profiles-'));
    temporaryDirectories.push(directory);
    const studio = { ...createDefaultProfile(), id: 'studio', name: 'Studio' };
    const gaming = { ...createDefaultProfile(), id: 'gaming', name: 'Gaming' };
    await writeFile(join(directory, 'studio.json'), JSON.stringify(studio), 'utf8');
    await writeFile(join(directory, 'gaming.json'), JSON.stringify(gaming), 'utf8');
    await writeFile(join(directory, 'preferences.json'), JSON.stringify({ theme: 'dark' }), 'utf8');
    await writeFile(join(directory, 'notes.txt'), 'not a profile', 'utf8');
    await writeFile(join(directory, 'broken.json'), '{bad json', 'utf8');
    await writeFile(join(directory, 'invalid.json'), JSON.stringify({ version: 1 }), 'utf8');
    const store = new FileProfileCatalogStore(directory);

    await expect(store.list()).resolves.toEqual([
      { id: 'gaming', name: 'Gaming' },
      { id: 'studio', name: 'Studio' },
    ]);
  });

  it('loads and saves profiles by stable id', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ulanzi-profiles-'));
    temporaryDirectories.push(directory);
    const store = new FileProfileCatalogStore(directory);
    const profile = { ...createDefaultProfile(), id: 'studio', name: 'Studio' };

    await store.save(profile);

    await expect(store.load('studio')).resolves.toEqual(profile);
    await expect(readFile(join(directory, 'studio.json'), 'utf8')).resolves.toContain('"name": "Studio"');
  });

  it('creates safe unique ids from profile names', () => {
    expect(createProfileId('My Profile', ['my-profile'])).toBe('my-profile-2');
    expect(createProfileId('  ', [])).toBe('profile');
  });
});
