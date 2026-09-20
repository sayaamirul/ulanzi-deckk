import { mkdir, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parseProfile } from '../domain/profile/schema';
import type { Profile, ProfileSummary } from '../domain/profile/types';
import { ProfileStore } from '../domain/profile/store';

export type ProfileCatalogStore = {
  list(): Promise<ProfileSummary[]>;
  load(id: string): Promise<Profile>;
  save(profile: Profile): Promise<void>;
};

const profileIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

export const createProfileId = (name: string, existingIds: string[]): string => {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'profile';
  const existing = new Set(existingIds);
  if (!existing.has(base)) return base;
  let suffix = 2;
  while (existing.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
};

export class FileProfileCatalogStore implements ProfileCatalogStore {
  private readonly profileStore = new ProfileStore();

  public constructor(private readonly directory: string) {}

  public async list(): Promise<ProfileSummary[]> {
    await mkdir(this.directory, { recursive: true });
    const entries = await readdir(this.directory, { withFileTypes: true });
    const summaries: ProfileSummary[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json') || entry.name === 'preferences.json') continue;
      const id = entry.name.slice(0, -'.json'.length);
      if (!profileIdPattern.test(id)) continue;
      try {
        const profile = parseProfile(JSON.parse(await readFile(join(this.directory, entry.name), 'utf8')));
        if (profile.id !== id) continue;
        summaries.push({ id: profile.id, name: profile.name });
      } catch {
        // Ignore malformed or invalid profile files so one bad file cannot block startup.
      }
    }
    return summaries.sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
  }

  public async load(id: string): Promise<Profile> {
    if (!profileIdPattern.test(id)) throw new Error(`Invalid profile id: ${id}`);
    return this.profileStore.load(join(this.directory, `${id}.json`));
  }

  public async save(profile: Profile): Promise<void> {
    if (!profileIdPattern.test(profile.id)) throw new Error(`Invalid profile id: ${profile.id}`);
    await this.profileStore.save(join(this.directory, `${profile.id}.json`), profile);
  }
}
