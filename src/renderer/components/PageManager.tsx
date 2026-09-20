import type { Page, Profile } from '../../domain/profile/types';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import {
  findFolderLinks,
  folderPages,
  isFolderPage,
  removeFolderPage,
} from '../../domain/profile/navigation';
import { FormButton } from './ui/FormButton';

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

const FolderRow = ({ folder, links, onOpen, onEdit, onDelete }: FolderRowProps) => (
  <article className="page-group-card">
    <div className="page-group-card-header">
      <div>
        <h3>{folder.name}</h3>
        <p className="muted">Page group</p>
      </div>
      <div className="page-group-actions">
        <FormButton className="icon-button" variant="icon" type="button" aria-label={`Open ${folder.name}`} title={`Open ${folder.name}`} onClick={() => onOpen(folder.id)}>
          <ExternalLink aria-hidden="true" />
        </FormButton>
        <FormButton className="icon-button" variant="icon" type="button" aria-label={`Edit ${folder.name}`} title={`Edit ${folder.name}`} onClick={(event) => onEdit(folder.id, event.currentTarget)}>
          <Pencil aria-hidden="true" />
        </FormButton>
        <FormButton
          className="icon-button"
          variant="icon"
          type="button"
          aria-label={`Delete ${folder.name}`}
          title={links.length > 0 ? `Linked from ${links.map((link) => `${link.pageId}/${link.slotId}`).join(', ')}` : `Delete ${folder.name}`}
          disabled={links.length > 0}
          onClick={() => onDelete(folder.id)}
        >
          <Trash2 aria-hidden="true" />
        </FormButton>
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
