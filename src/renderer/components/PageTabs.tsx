import type { Page } from '../../domain/profile/types';
import { FormButton } from './ui/FormButton';

type Props = {
  pages: Page[];
  activePageId: string;
  onSelect: (pageId: string) => void;
};

export const PageTabs = ({ pages, activePageId, onSelect }: Props) => (
  <nav className="page-tabs" aria-label="Profile pages">
    {pages.map((page) => (
      <FormButton
        className={[
          'page-tab',
          page.id === activePageId ? 'is-active' : '',
          page.id === 'main' ? 'page-tab--breadcrumb' : '',
        ].filter(Boolean).join(' ')}
        key={page.id}
        type="button"
        onClick={() => onSelect(page.id)}
      >
        {page.name}
      </FormButton>
    ))}
  </nav>
);
