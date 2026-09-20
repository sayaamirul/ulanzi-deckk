import { useState } from 'react';
import type { Page, Profile } from '../../domain/profile/types';
import {
  createFolderPage,
  findFolderLinks,
  folderPages,
  isFolderPage,
  removeFolderPage,
} from '../../domain/profile/navigation';

type Props = {
  profile: Profile;
  activePageId: string;
  onSaveProfile: (profile: Profile) => Promise<void>;
  onSelectPage: (pageId: string) => void;
};

type FolderRowProps = {
  folder: Page;
  links: Array<{ pageId: string; slotId: string }>;
  onRename: (folder: Page, name: string) => void;
  onOpen: (pageId: string) => void;
  onDelete: (pageId: string) => void;
};

const folderId = (): string => `folder-${crypto.randomUUID()}`;

const FolderRow = ({ folder, links, onRename, onOpen, onDelete }: FolderRowProps) => {
  const [name, setName] = useState(folder.name);

  return (
    <div className="folder-row">
      <input aria-label={`Folder name ${folder.id}`} value={name} onChange={(event) => setName(event.target.value)} />
      <button type="button" onClick={() => onRename(folder, name)}>Rename {folder.name}</button>
      <button type="button" onClick={() => onOpen(folder.id)}>Open</button>
      <button
        type="button"
        aria-label={`Delete ${folder.name}`}
        disabled={links.length > 0}
        title={links.length > 0 ? `Linked from ${links.map((link) => `${link.pageId}/${link.slotId}`).join(', ')}` : undefined}
        onClick={() => onDelete(folder.id)}
      >
        Delete {folder.name}
      </button>
      {links.length > 0 && <small className="folder-warning">Linked from {links.map((link) => `${link.pageId}/${link.slotId}`).join(', ')}</small>}
    </div>
  );
};

export const PageManager = ({ profile, activePageId, onSaveProfile, onSelectPage }: Props) => {
  const activePage = profile.pages.find((page) => page.id === activePageId);
  const parentPage = activePage && isFolderPage(activePage)
    ? profile.pages.find((page) => page.id === activePage.parentPageId)
    : activePage;
  const [name, setName] = useState('');

  if (!parentPage || isFolderPage(parentPage)) return null;

  const folders = folderPages(profile, parentPage.id);
  const save = (nextProfile: Profile): void => { void onSaveProfile(nextProfile); };
  const create = () => {
    if (!name.trim()) return;
    save(createFolderPage(profile, parentPage.id, name, folderId()));
    setName('');
  };
  const rename = (folder: Page, nextName: string) => {
    const trimmedName = nextName.trim();
    if (!trimmedName) return;
    save({
      ...profile,
      pages: profile.pages.map((page) => page.id === folder.id ? { ...page, name: trimmedName } : page),
    });
  };
  const remove = (folderIdToRemove: string) => {
    try {
      save(removeFolderPage(profile, folderIdToRemove));
    } catch {
      // Linked folders are disabled below; keep the UI state unchanged if a stale snapshot races a click.
    }
  };

  return (
    <section className="page-manager" aria-label="Page and folder manager">
      <div className="page-manager-heading">
        <div>
          <p className="eyebrow">PAGE GROUPS</p>
          <h2>Folders in {parentPage.name}</h2>
        </div>
      </div>
      <div className="folder-create">
        <label>
          New folder
          <input aria-label="Folder name" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <button type="button" onClick={create}>Create folder</button>
      </div>
      <div className="folder-list">
        {folders.length === 0 && <p className="muted">No folders yet.</p>}
        {folders.map((folder) => {
          const links = findFolderLinks(profile, folder.id);
          return (
            <FolderRow key={folder.id} folder={folder} links={links} onRename={rename} onOpen={onSelectPage} onDelete={remove} />
          );
        })}
      </div>
    </section>
  );
};
