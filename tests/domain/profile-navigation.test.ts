import { describe, expect, it } from 'vitest';
import type { Profile } from '../../src/domain/profile/types';
import { parseProfile } from '../../src/domain/profile/schema';
import {
  createFolderPage,
  findFolderLinks,
  folderPages,
  isFolderPage,
  isTopLevelPage,
  removeFolderPage,
  topLevelPages,
} from '../../src/domain/profile/navigation';

const baseProfile: Profile = {
  version: 1,
  id: 'stream-control',
  name: 'Stream Control',
  activePageId: 'main',
  pages: [
    { id: 'main', name: 'Main', slots: {} },
    { id: 'apps', name: 'Apps', kind: 'folder', parentPageId: 'main', slots: {} },
    { id: 'other', name: 'Other', slots: {} },
  ],
};

describe('profile navigation helpers', () => {
  it('treats legacy pages as normal top-level pages', () => {
    const legacyPage = baseProfile.pages[0];

    expect(isFolderPage(legacyPage)).toBe(false);
    expect(isTopLevelPage(legacyPage)).toBe(true);
    expect(topLevelPages(baseProfile).map((page) => page.id)).toEqual(['main', 'other']);
  });

  it('returns only folders belonging to the requested parent', () => {
    expect(folderPages(baseProfile, 'main')).toEqual([baseProfile.pages[1]]);
    expect(folderPages(baseProfile, 'other')).toEqual([]);
  });

  it('finds every slot linking to a folder', () => {
    const profile: Profile = {
      ...baseProfile,
      pages: baseProfile.pages.map((page) => page.id === 'main'
        ? { ...page, slots: { '0_0': { id: '0_0', label: 'Apps', action: { type: 'page.goto', pageId: 'apps' } } } }
        : page),
    };

    expect(findFolderLinks(profile, 'apps')).toEqual([{ pageId: 'main', slotId: '0_0' }]);
  });

  it('creates and removes folders without mutating the source profile', () => {
    const created = createFolderPage(baseProfile, 'main', 'Utilities', 'utilities');

    expect(created).not.toBe(baseProfile);
    expect(created.pages.at(-1)).toEqual({ id: 'utilities', name: 'Utilities', kind: 'folder', parentPageId: 'main', slots: {} });
    expect(removeFolderPage(created, 'utilities')).toEqual(created === baseProfile ? baseProfile : {
      ...baseProfile,
      pages: baseProfile.pages,
    });
    expect(baseProfile.pages).toHaveLength(3);
  });

  it('blocks removal while a slot links to the folder', () => {
    const linked: Profile = {
      ...baseProfile,
      pages: baseProfile.pages.map((page) => page.id === 'main'
        ? { ...page, slots: { '0_0': { id: '0_0', label: 'Apps', action: { type: 'page.goto', pageId: 'apps' } } } }
        : page),
    };

    expect(() => removeFolderPage(linked, 'apps')).toThrow(/main\/0_0/);
  });

  it('moves the active page to its parent when removing an unlinked folder', () => {
    const activeFolder = { ...baseProfile, activePageId: 'apps' };

    const removed = removeFolderPage(activeFolder, 'apps');

    expect(removed.activePageId).toBe('main');
    expect(() => parseProfile(removed)).not.toThrow();
  });
});
