// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from '../../src/domain/profile/types';
import { PageManager } from '../../src/renderer/components/PageManager';

const profile: Profile = {
  version: 1,
  id: 'stream-control',
  name: 'Stream Control',
  activePageId: 'main',
  pages: [
    {
      id: 'main',
      name: 'Main',
      slots: {
        '0_0': { id: '0_0', label: 'Apps', action: { type: 'page.goto', pageId: 'apps' } },
      },
    },
    { id: 'apps', name: 'Apps', kind: 'folder', parentPageId: 'main', slots: {} },
    { id: 'free', name: 'Free', kind: 'folder', parentPageId: 'main', slots: {} },
  ],
};

describe('page manager', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('blocks linked-folder deletion and identifies the linking slot', async () => {
    const user = userEvent.setup();
    const onSaveProfile = vi.fn(async () => undefined);
    render(<PageManager profile={profile} activePageId="main" onSaveProfile={onSaveProfile} onSelectPage={vi.fn()} />);

    const apps = screen.getByRole('button', { name: /delete apps/i });
    expect(apps).toBeDisabled();
    expect(screen.getByText(/main\/0_0/i)).toBeInTheDocument();
    await user.click(apps);
    expect(onSaveProfile).not.toHaveBeenCalled();
  });

  it('deletes an unlinked folder', async () => {
    const user = userEvent.setup();
    const onSaveProfile = vi.fn(async () => undefined);
    render(<PageManager profile={profile} activePageId="main" onSaveProfile={onSaveProfile} onSelectPage={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /delete free/i }));

    expect(onSaveProfile).toHaveBeenCalledWith(expect.objectContaining({
      pages: expect.not.arrayContaining([expect.objectContaining({ id: 'free' })]),
    }));
  });

  it('renames a folder explicitly', async () => {
    const user = userEvent.setup();
    const onSaveProfile = vi.fn(async () => undefined);
    render(<PageManager profile={profile} activePageId="main" onSaveProfile={onSaveProfile} onSelectPage={vi.fn()} />);

    const name = screen.getByLabelText('Folder name free');
    await user.clear(name);
    await user.type(name, 'Tools');
    await user.click(screen.getByRole('button', { name: /rename free/i }));

    expect(onSaveProfile).toHaveBeenCalledWith(expect.objectContaining({
      pages: expect.arrayContaining([expect.objectContaining({ id: 'free', name: 'Tools' })]),
    }));
  });

  it('moves the active page to its parent before deleting an open folder', async () => {
    const user = userEvent.setup();
    const onSaveProfile = vi.fn(async () => undefined);
    const activeProfile = {
      ...profile,
      activePageId: 'apps',
      pages: profile.pages.map((page) => page.id === 'main' ? { ...page, slots: {} } : page),
    };
    render(<PageManager profile={activeProfile} activePageId="apps" onSaveProfile={onSaveProfile} onSelectPage={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /delete apps/i }));

    expect(onSaveProfile).toHaveBeenCalledWith(expect.objectContaining({
      activePageId: 'main',
      pages: expect.not.arrayContaining([expect.objectContaining({ id: 'apps' })]),
    }));
  });
});
