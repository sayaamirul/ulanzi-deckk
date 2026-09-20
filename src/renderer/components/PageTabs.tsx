import type { Page } from '../../domain/profile/types';

type Props = {
  pages: Page[];
  activePageId: string;
  onSelect: (pageId: string) => void;
};

export const PageTabs = ({ pages, activePageId, onSelect }: Props) => (
  <nav className="page-tabs" aria-label="Profile pages">
    {pages.map((page) => (
      <button
        className={page.id === activePageId ? 'page-tab is-active' : 'page-tab'}
        key={page.id}
        type="button"
        onClick={() => onSelect(page.id)}
      >
        {page.name}
      </button>
    ))}
  </nav>
);
