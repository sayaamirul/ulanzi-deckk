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
    const profile = parseProfile(validProfileFixture);
    expect(profile).toMatchObject({
      id: 'stream-control',
      version: 1,
    });
    expect(profile.pages[0]?.kind).toBe('normal');
  });

  it('round-trips a legacy profile and only adds the normal-page default', () => {
    const parsed = parseProfile(validProfileFixture);
    const roundTripped = parseProfile(JSON.parse(JSON.stringify(parsed)));

    expect(roundTripped).toEqual(parsed);
    expect(roundTripped.pages[0]).toMatchObject({ id: 'main', kind: 'normal' });
  });

  it('accepts a folder with a normal parent', () => {
    expect(parseProfile({
      ...validProfileFixture,
      pages: [
        validProfileFixture.pages[0],
        { id: 'apps', name: 'Apps', kind: 'folder', parentPageId: 'main', slots: {} },
      ],
    }).pages[1]).toMatchObject({ kind: 'folder', parentPageId: 'main' });
  });

  it('rejects a folder whose parent does not exist', () => {
    expect(() => parseProfile({
      ...validProfileFixture,
      pages: [{ id: 'apps', name: 'Apps', kind: 'folder', parentPageId: 'missing', slots: {} }],
      activePageId: 'apps',
    })).toThrow(/folder parent does not exist/i);
  });

  it('rejects folders nested inside folders', () => {
    expect(() => parseProfile({
      ...validProfileFixture,
      pages: [
        validProfileFixture.pages[0],
        { id: 'apps', name: 'Apps', kind: 'folder', parentPageId: 'main', slots: {} },
        { id: 'tools', name: 'Tools', kind: 'folder', parentPageId: 'apps', slots: {} },
      ],
    })).toThrow(/folders cannot contain folders/i);
  });

  it('rejects page navigation to missing or unrelated folders', () => {
    expect(() => parseProfile({
      ...validProfileFixture,
      pages: [{
        ...validProfileFixture.pages[0],
        slots: { '0_0': { id: '0_0', label: 'Missing', action: { type: 'page.goto', pageId: 'missing' } } },
      }],
    })).toThrow(/page navigation target does not exist/i);

    expect(() => parseProfile({
      ...validProfileFixture,
      pages: [
        { id: 'main', name: 'Main', slots: { '0_0': { id: '0_0', label: 'Apps', action: { type: 'page.goto', pageId: 'apps' } } } },
        { id: 'other', name: 'Other', slots: {} },
        { id: 'apps', name: 'Apps', kind: 'folder', parentPageId: 'other', slots: {} },
      ],
    })).toThrow(/folder parent must match/i);
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
