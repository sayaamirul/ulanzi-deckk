import type { Page, Profile, SlotId } from './types';

export const isFolderPage = (page: Page): boolean => page.kind === 'folder';

export const isTopLevelPage = (page: Page): boolean => !isFolderPage(page) && !page.parentPageId;

export const topLevelPages = (profile: Profile): Page[] => profile.pages.filter(isTopLevelPage);

export const folderPages = (profile: Profile, parentPageId: string): Page[] => profile.pages.filter(
  (page) => isFolderPage(page) && page.parentPageId === parentPageId,
);

export const findFolderLinks = (profile: Profile, folderPageId: string): Array<{ pageId: string; slotId: SlotId }> => {
  const links: Array<{ pageId: string; slotId: SlotId }> = [];
  for (const page of profile.pages) {
    for (const [slotId, slot] of Object.entries(page.slots)) {
      if (slot?.action.type === 'page.goto' && slot.action.pageId === folderPageId) {
        links.push({ pageId: page.id, slotId: slotId as SlotId });
      }
    }
  }
  return links;
};

export const createFolderPage = (profile: Profile, parentPageId: string, name: string, id: string): Profile => {
  const trimmedName = name.trim();
  const parent = profile.pages.find((page) => page.id === parentPageId);
  if (!trimmedName) throw new Error('folder name cannot be empty');
  if (!id.trim()) throw new Error('folder id cannot be empty');
  if (!parent || !isTopLevelPage(parent)) throw new Error('folder parent must be a top-level page');
  if (profile.pages.some((page) => page.id === id)) throw new Error(`page id already exists: ${id}`);

  return {
    ...profile,
    pages: [...profile.pages, { id, name: trimmedName, kind: 'folder', parentPageId, slots: {} }],
  };
};

export const removeFolderPage = (profile: Profile, folderPageId: string): Profile => {
  const page = profile.pages.find((candidate) => candidate.id === folderPageId);
  if (!page || !isFolderPage(page)) throw new Error('folder page not found');

  const links = findFolderLinks(profile, folderPageId);
  if (links.length > 0) {
    const locations = links.map((link) => `${link.pageId}/${link.slotId}`).join(', ');
    throw new Error(`folder is linked from ${locations}`);
  }

  return {
    ...profile,
    activePageId: profile.activePageId === folderPageId ? page.parentPageId! : profile.activePageId,
    pages: profile.pages.filter((candidate) => candidate.id !== folderPageId),
  };
};
