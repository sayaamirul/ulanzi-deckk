import { describe, expect, it } from 'vitest';
import { createDefaultProfile } from '../../src/main/config';

describe('application config', () => {
  it('creates a streaming profile with the D200H reserved slot omitted', () => {
    const profile = createDefaultProfile();

    expect(profile.id).toBe('stream-control');
    expect(profile.pages[0].slots['0_0']?.action).toEqual({ type: 'obs.stream.toggle' });
    expect(profile.pages[0].slots).not.toHaveProperty('2_4');
  });
});
