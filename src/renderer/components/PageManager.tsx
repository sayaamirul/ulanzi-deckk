import type { Page, Profile } from '../../domain/profile/types';
import {
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
  onEditPageGroup: (pageId: string, trigger: HTMLElement) => void;
};

type FolderRowProps = {
  folder: Page;
  links: Array<{ pageId: string; slotId: string }>;
  onOpen: (pageId: string) => void;
  onEdit: (pageId: string, trigger: HTMLElement) => void;
  onDelete: (pageId: string) => void;
};

const OpenIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M14 4h6v6" />
    <path d="m20 4-9 9" />
    <path d="M19 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
  </svg>
);

const EditIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
  </svg>
);

const DeleteIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 7h16" />
    <path d="M10 11v6M14 11v6" />
    <path d="m6 7 1 13h10l1-13" />
    <path d="M9 7V4h6v3" />
  </svg>
);

const FolderRow = ({ folder, links, onOpen, onEdit, onDelete }: FolderRowProps) => (
  <article className="page-group-card">
    <div className="page-group-card-header">
      <div>
        <h3>{folder.name}</h3>
        <p className="muted">Page group</p>
      </div>
      <div className="page-group-actions">
        <button className="icon-button" type="button" aria-label={`Open ${folder.name}`} title={`Open ${folder.name}`} onClick={() => onOpen(folder.id)}>
          <OpenIcon />
        </button>
        <button className="icon-button" type="button" aria-label={`Edit ${folder.name}`} title={`Edit ${folder.name}`} onClick={(event) => onEdit(folder.id, event.currentTarget)}>
          <EditIcon />
        </button>
        <button
          className="icon-button"
          type="button"
          aria-label={`Delete ${folder.name}`}
          title={links.length > 0 ? `Linked from ${links.map((link) => `${link.pageId}/${link.slotId}`).join(', ')}` : `Delete ${folder.name}`}
          disabled={links.length > 0}
          onClick={() => onDelete(folder.id)}
        >
          <DeleteIcon />
        </button>
      </div>
    </div>
    {links.length > 0 && <small className="folder-warning">Linked from {links.map((link) => `${link.pageId}/${link.slotId}`).join(', ')}</small>}
  </article>
);

export const PageManager = ({ profile, activePageId, onSaveProfile, onSelectPage, onEditPageGroup }: Props) => {
  const activePage = profile.pages.find((page) => page.id === activePageId);
  const parentPage = activePage && isFolderPage(activePage)
    ? profile.pages.find((page) => page.id === activePage.parentPageId)
    : activePage;

  if (!parentPage || isFolderPage(parentPage)) return null;

  const folders = folderPages(profile, parentPage.id);
  const save = (nextProfile: Profile): void => { void onSaveProfile(nextProfile); };
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
          <h2>Page Groups</h2>
          <p className="muted">Grouped under {parentPage.name}</p>
        </div>
      </div>
      <div className="page-group-list">
        {folders.length === 0 && <p className="muted">No page groups yet.</p>}
        {folders.map((folder) => {
          const links = findFolderLinks(profile, folder.id);
          return <FolderRow key={folder.id} folder={folder} links={links} onOpen={onSelectPage} onEdit={onEditPageGroup} onDelete={remove} />;
        })}
      </div>
    </section>
  );
};
