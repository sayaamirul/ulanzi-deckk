import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { parseProfile } from './schema';
import type { Profile } from './types';

export class ProfileLoadError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ProfileLoadError';
  }
}

export class ProfileStore {
  async load(path: string): Promise<Profile> {
    try {
      const contents = await readFile(path, 'utf8');
      return parseProfile(JSON.parse(contents));
    } catch (error) {
      if (error instanceof ProfileLoadError) throw error;
      throw new ProfileLoadError(`Unable to load profile: ${path}`, { cause: error });
    }
  }

  async save(path: string, profile: Profile): Promise<void> {
    const directory = dirname(path);
    await mkdir(join(directory, 'assets'), { recursive: true });
    const temporaryPath = `${path}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(profile, null, 2)}\n`, 'utf8');
    await rename(temporaryPath, path);
  }

  async export(profile: Profile, destination: string): Promise<void> {
    await this.save(destination, profile);
  }
}
