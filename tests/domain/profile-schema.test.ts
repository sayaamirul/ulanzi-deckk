import { describe, expect, it } from 'vitest';
import { parseProfile } from '../../src/domain/profile/schema';

const validProfileFixture = {
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

const profileWithSlot = (slotId: string) => ({
  ...validProfileFixture,
  pages: [{
    ...validProfileFixture.pages[0],
    slots: {
      ...validProfileFixture.pages[0].slots,
      [slotId]: { id: slotId, label: 'Invalid', action: { type: 'obs.stream.toggle' } },
    },
  }],
});

const profileWithAction = (action: unknown) => ({
  ...validProfileFixture,
  pages: [{
    ...validProfileFixture.pages[0],
    slots: { '0_0': { id: '0_0', label: 'Scene', action } },
  }],
});

describe('profile schema', () => {
  it('accepts a valid profile', () => {
    expect(parseProfile(validProfileFixture)).toMatchObject({
      id: 'stream-control',
      version: 1,
    });
  });

  it('accepts thirteen configurable slots and rejects the reserved slot', () => {
    const profile = parseProfile(validProfileFixture);
    expect(profile.pages[0].slots['0_0']).toBeDefined();
    expect(() => parseProfile(profileWithSlot('2_4'))).toThrow(/reserved/i);
  });

  it('rejects an action without the required action fields', () => {
    expect(() => parseProfile(profileWithAction({ type: 'obs.scene.set' }))).toThrow(/sceneName/i);
  });

  it('rejects an asset path that escapes the profile directory', () => {
    expect(() => parseProfile({
      ...validProfileFixture,
      pages: [{
        ...validProfileFixture.pages[0],
        slots: {
          '0_0': {
            id: '0_0',
            label: 'Unsafe',
            iconPath: '../outside.png',
            action: { type: 'obs.stream.toggle' },
          },
        },
      }],
    })).toThrow(/asset/i);
  });
});
