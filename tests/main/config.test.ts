import { describe, expect, it } from 'vitest';
import { createDefaultProfile, preferencesPath, profileDirectory, repairActiveProfilePreference } from '../../src/main/config';

describe('application config', () => {
  it('creates a streaming profile with the D200H reserved slot omitted', () => {
    const profile = createDefaultProfile();

    expect(profile.id).toBe('stream-control');
    expect(profile.pages[0]?.kind).toBe('normal');
    expect(profile.pages[0].slots['0_0']?.action).toEqual({ type: 'obs.stream.toggle' });
    expect(profile.pages[0].slots).not.toHaveProperty('2_4');
  });

  it('stores app preferences alongside profiles', () => {
    expect(preferencesPath()).toBe(`${profileDirectory()}/preferences.json`);
  });

  it('repairs a missing active profile preference after fallback', async () => {
    const saves: unknown[] = [];
    await repairActiveProfilePreference(
      { load: async () => ({ theme: 'dark' }), save: async (preferences) => { saves.push(preferences); } },
      { theme: 'dark', activeProfileId: 'missing' },
      createDefaultProfile(),
    );

    expect(saves).toEqual([{ theme: 'dark', activeProfileId: 'stream-control' }]);
  });
});
