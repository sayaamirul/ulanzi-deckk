import type { Page } from '../../domain/profile/types';

type Props = {
  parentPage: Page;
  currentPage: Page;
  onNavigate: (pageId: string) => void;
};

export const PageBreadcrumbs = ({ parentPage, currentPage, onNavigate }: Props) => (
  <nav className="page-breadcrumbs" aria-label="Page breadcrumbs">
    <button type="button" onClick={() => onNavigate(parentPage.id)}>{parentPage.name}</button>
    <span aria-hidden="true">/</span>
    <span aria-current="page">{currentPage.name}</span>
  </nav>
);
