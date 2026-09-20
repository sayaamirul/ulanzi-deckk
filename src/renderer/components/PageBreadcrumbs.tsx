import type { Page } from '../../domain/profile/types';
import { FormButton } from './ui/FormButton';

type Props = {
  parentPage: Page;
  currentPage: Page;
  onNavigate: (pageId: string) => void;
};

export const PageBreadcrumbs = ({ parentPage, currentPage, onNavigate }: Props) => (
  <nav className="page-breadcrumbs" aria-label="Page breadcrumbs">
    <FormButton variant="ghost" type="button" onClick={() => onNavigate(parentPage.id)}>{parentPage.name}</FormButton>
    <span aria-hidden="true">/</span>
    <span aria-current="page">{currentPage.name}</span>
  </nav>
);
