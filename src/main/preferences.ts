import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export type ThemePreference = 'light' | 'dark' | 'system';

export type AppPreferences = {
  theme: ThemePreference;
};

export const DEFAULT_APP_PREFERENCES: AppPreferences = { theme: 'system' };

export const normalizePreferences = (input: unknown): AppPreferences => {
  if (typeof input !== 'object' || input === null || !('theme' in input)) {
    return { ...DEFAULT_APP_PREFERENCES };
  }

  const theme = (input as { theme?: unknown }).theme;
  if (theme === 'light' || theme === 'dark' || theme === 'system') {
    return { theme };
  }

  return { ...DEFAULT_APP_PREFERENCES };
};

const isMissingFileError = (error: unknown): boolean => (
  typeof error === 'object'
  && error !== null
  && 'code' in error
  && (error as { code?: unknown }).code === 'ENOENT'
);

export class FilePreferencesStore {
  private writeQueue: Promise<void> = Promise.resolve();

  public constructor(private readonly path: string) {}

  public async load(): Promise<AppPreferences> {
    let contents: string;
    try {
      contents = await readFile(this.path, 'utf8');
    } catch (error) {
      if (isMissingFileError(error)) return { ...DEFAULT_APP_PREFERENCES };
      throw error;
    }

    try {
      return normalizePreferences(JSON.parse(contents));
    } catch {
      return { ...DEFAULT_APP_PREFERENCES };
    }
  }

  public async save(preferences: AppPreferences): Promise<void> {
    const write = async () => {
      await mkdir(dirname(this.path), { recursive: true });
      const temporaryPath = `${this.path}.tmp`;
      await writeFile(temporaryPath, `${JSON.stringify(normalizePreferences(preferences), null, 2)}\n`, 'utf8');
      await rename(temporaryPath, this.path);
    };
    const nextWrite = this.writeQueue.then(write, write);
    this.writeQueue = nextWrite.catch(() => undefined);
    await nextWrite;
  }
}

export type PreferencesStore = Pick<FilePreferencesStore, 'load' | 'save'>;
