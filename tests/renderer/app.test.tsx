// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppSnapshot } from '../../src/main/runtime';
import App from '../../src/renderer/App';

const slotIds = [
  '0_0', '0_1', '0_2', '0_3', '0_4',
  '1_0', '1_1', '1_2', '1_3', '1_4',
  '2_0', '2_1', '2_2',
] as const;

const streamSnapshotFixture: AppSnapshot = {
  profile: {
    version: 1,
    id: 'stream-control',
    name: 'Stream Control',
    activePageId: 'main',
    pages: [{ id: 'main', name: 'Main', slots: {
      '0_0': { id: '0_0', label: 'Stream', action: { type: 'obs.stream.toggle' } },
    }}],
  },
  activePageId: 'main',
  renderedPage: {
    pageId: 'main',
    slots: Object.fromEntries(slotIds.map((id) => [id, {
      id,
      visual: id === '0_0' ? 'inactive' : 'empty',
      label: id === '0_0' ? 'Stream' : '',
      png: Buffer.alloc(0),
    }])),
  } as AppSnapshot['renderedPage'],
  device: { status: 'disconnected' },
  obs: { connected: false, streaming: false, recording: false, replayBuffer: false, mutedInputs: {} },
};

const api = {
  getSnapshot: vi.fn(async () => streamSnapshotFixture),
  onSnapshot: vi.fn(() => () => undefined),
  saveProfile: vi.fn(async (_profile: AppSnapshot['profile']) => undefined),
  selectPage: vi.fn(async () => undefined),
  dispatchSlot: vi.fn(async () => undefined),
  connectObs: vi.fn(async () => undefined),
  setBrightness: vi.fn(async () => undefined),
  getPreferences: vi.fn(async () => ({ theme: 'system' as const })),
  savePreferences: vi.fn(async () => undefined),
};

const folderSnapshotFixture: AppSnapshot = {
  ...streamSnapshotFixture,
  profile: {
    ...streamSnapshotFixture.profile,
    pages: [
      {
        id: 'main',
        name: 'Main',
        slots: {
          '0_0': { id: '0_0', label: 'Apps', action: { type: 'page.goto', pageId: 'apps' } },
          '0_1': { id: '0_1', label: 'Empty', action: { type: 'obs.stream.toggle' } },
        },
      },
      { id: 'apps', name: 'Apps', kind: 'folder', parentPageId: 'main', slots: {} },
    ],
  },
};

const activeFolderSnapshotFixture: AppSnapshot = {
  ...folderSnapshotFixture,
  activePageId: 'apps',
  profile: {
    ...folderSnapshotFixture.profile,
    activePageId: 'apps',
    pages: folderSnapshotFixture.profile.pages.map((page) => page.id === 'main'
      ? { ...page, slots: { '0_0': { id: '0_0', label: 'Stream', action: { type: 'obs.stream.toggle' } } } }
      : page),
  },
  renderedPage: {
    ...folderSnapshotFixture.renderedPage,
    pageId: 'apps',
  },
};

describe('profile editor', () => {
  afterEach(() => {
    cleanup();
    delete document.documentElement.dataset.theme;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    api.getSnapshot.mockResolvedValue(streamSnapshotFixture);
    api.getPreferences.mockResolvedValue({ theme: 'system' });
    api.savePreferences.mockResolvedValue(undefined);
    Object.defineProperty(window, 'ulanzi', { configurable: true, value: api });
  });

  it('opens the Settings screen from the toolbar', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Settings' }));

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Build your stream surface' })).not.toBeInTheDocument();
  });

  it('shows Auto selected with Light, Dark, and Auto theme choices', async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Settings' }));

    expect(screen.getByRole('radio', { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /dark/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /auto/i })).toBeChecked();
  });

  it('applies and persists a selected theme immediately', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Settings' }));

    await user.click(screen.getByRole('radio', { name: /light/i }));

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(api.savePreferences).toHaveBeenCalledWith({ theme: 'light' });
  });

  it('returns to the workspace and restores focus to the Settings trigger', async () => {
    const user = userEvent.setup();
    render(<App />);
    const settingsButton = await screen.findByRole('button', { name: 'Settings' });
    await user.click(settingsButton);
    await user.click(screen.getByRole('button', { name: /back to workspace/i }));

    expect(screen.getByRole('heading', { name: 'Build your stream surface' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus();
  });

  it('keeps the selected theme and reports a persistence error', async () => {
    const user = userEvent.setup();
    api.savePreferences.mockRejectedValueOnce(new Error('disk full'));
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('radio', { name: /light/i }));

    expect(screen.getByRole('radio', { name: /light/i })).toBeChecked();
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(screen.getByRole('alert')).toHaveTextContent(/could not save/i);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('shows all thirteen configurable D200H slots', async () => {
    render(<App />);

    expect(await screen.findAllByRole('button', { name: /slot/i })).toHaveLength(13);
    expect(screen.queryByText('2_4')).not.toBeInTheDocument();
  });

  it('opens an empty action card for an unassigned key', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /slot 0_1/i }));

    expect(screen.getByRole('region', { name: 'Slot editor' })).toHaveTextContent('No action assigned');
    expect(screen.getByRole('button', { name: /add action/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('Action group')).not.toBeInTheDocument();
  });

  it('moves focus to the label field after starting an empty action', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /slot 0_1/i }));
    await user.click(screen.getByRole('button', { name: /add action/i }));

    expect(screen.getByLabelText('Button label')).toHaveFocus();
  });

  it('opens an assigned action directly in edit mode', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /slot 0_0/i }));

    expect(screen.getByRole('region', { name: 'Slot editor' })).toHaveTextContent('Edit action');
    expect(screen.getByLabelText('Action group')).toHaveValue('OBS');
    expect(screen.getByLabelText('Action type')).toHaveValue('obs.stream.toggle');
  });

  it('remounts the slot editor when the active page changes', async () => {
    const user = userEvent.setup();
    let publishSnapshot: ((snapshot: AppSnapshot) => void) | undefined;
    const captureSnapshotListener = (listener: (snapshot: AppSnapshot) => void) => {
      publishSnapshot = listener;
      return () => undefined;
    };
    api.onSnapshot.mockImplementation(captureSnapshotListener as typeof api.onSnapshot);
    const secondPageSnapshot: AppSnapshot = {
      ...streamSnapshotFixture,
      activePageId: 'second',
      profile: {
        ...streamSnapshotFixture.profile,
        activePageId: 'second',
        pages: [
          streamSnapshotFixture.profile.pages[0]!,
          {
            id: 'second',
            name: 'Second',
            slots: { '0_1': { id: '0_1', label: 'Second action', action: { type: 'obs.stream.toggle' } } },
          },
        ],
      },
      renderedPage: {
        ...streamSnapshotFixture.renderedPage,
        pageId: 'second',
        slots: {
          ...streamSnapshotFixture.renderedPage.slots,
          '0_1': { ...streamSnapshotFixture.renderedPage.slots['0_1']!, label: 'Second action', visual: 'inactive' },
        },
      },
    };
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /slot 0_1/i }));
    await user.click(screen.getByRole('button', { name: /add action/i }));
    await user.clear(screen.getByLabelText('Button label'));
    await user.type(screen.getByLabelText('Button label'), 'Main draft');

    await act(async () => { publishSnapshot?.(secondPageSnapshot); });

    expect(screen.getByLabelText('Button label')).toHaveValue('Second action');
    expect(screen.getByRole('heading', { name: 'Edit action' })).toBeInTheDocument();
  });

  it('adds an action from an empty card and saves it to the clicked key', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /slot 0_1/i }));
    await user.click(screen.getByRole('button', { name: /add action/i }));
    await user.clear(screen.getByLabelText('Button label'));
    await user.type(screen.getByLabelText('Button label'), 'Browser');
    await user.selectOptions(screen.getByLabelText('Action group'), 'System');
    await user.selectOptions(screen.getByLabelText('Action type'), 'system.open');
    await user.type(screen.getByLabelText('URL or file'), 'https://example.com');
    await user.click(screen.getByRole('button', { name: /save slot/i }));

    expect(api.saveProfile).toHaveBeenCalledWith(expect.objectContaining({
      pages: expect.arrayContaining([
        expect.objectContaining({
          id: 'main',
          slots: expect.objectContaining({
            '0_1': expect.objectContaining({ label: 'Browser', action: { type: 'system.open', target: 'https://example.com' } }),
          }),
        }),
      ]),
    }));
  });

  it('keeps slot and folder management together in the workspace sidebar', async () => {
    render(<App />);

    const sidebar = await screen.findByRole('complementary', { name: 'Workspace sidebar' });
    const pageManager = screen.getByRole('region', { name: 'Page and folder manager' });

    expect(sidebar).toContainElement(pageManager);
    expect(document.querySelector('.layout-panel')).not.toContainElement(pageManager);
  });

  it('saves an OBS scene action from the slot editor', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /slot 0_0/i }));
    await user.selectOptions(screen.getByLabelText('Action group'), 'OBS');
    await user.selectOptions(screen.getByLabelText('Action type'), 'obs.scene.set');
    await user.type(screen.getByLabelText('Scene name'), 'Starting Soon');
    await user.click(screen.getByRole('button', { name: /save slot/i }));

    expect(api.saveProfile).toHaveBeenCalledTimes(1);
    const savedProfile = api.saveProfile.mock.calls[0]?.[0];
    expect(savedProfile?.pages[0]?.slots['0_0']?.action).toEqual({
      type: 'obs.scene.set',
      sceneName: 'Starting Soon',
    });
  });

  it('connects OBS using the local default endpoint', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /connect obs/i }));

    expect(api.connectObs).toHaveBeenCalledWith({ url: 'ws://127.0.0.1:4455' });
  });

  it('persists a profile name edit', async () => {
    const user = userEvent.setup();
    render(<App />);

    const input = await screen.findByLabelText('Profile name');
    await user.clear(input);
    await user.type(input, 'Live Show');
    await user.click(screen.getByRole('button', { name: /save profile/i }));

    expect(api.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ name: 'Live Show' }));
  });

  it('shows only normal pages in tabs and keeps page groups in the sidebar', async () => {
    const user = userEvent.setup();
    api.getSnapshot.mockResolvedValueOnce(folderSnapshotFixture);
    render(<App />);

    expect(await screen.findByRole('button', { name: 'Main' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apps' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Page and folder manager' })).toHaveTextContent('Page Groups');
    expect(screen.getByRole('button', { name: /open apps/i })).toBeInTheDocument();
  });

  it('opens the add page group dialog from the layout card', async () => {
    const user = userEvent.setup();
    api.getSnapshot.mockResolvedValueOnce(folderSnapshotFixture);
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Add' }));
    expect(screen.getByRole('menuitem', { name: 'Page Groups' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Page Groups' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menuitem', { name: 'Page Groups' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.click(screen.getByRole('menuitem', { name: 'Page Groups' }));

    expect(screen.getByRole('dialog', { name: 'Add Page Group' })).toBeInTheDocument();
    expect(screen.getByLabelText('Page group name')).toBeInTheDocument();
    expect(screen.getByLabelText('Page group name')).toHaveFocus();
    await user.type(screen.getByLabelText('Page group name'), 'Example');

    await user.tab();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: /create page group/i })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: /create page group/i })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Add Page Group' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toHaveFocus();
  });

  it('creates a page group from the layout card dialog', async () => {
    const user = userEvent.setup();
    api.getSnapshot.mockResolvedValueOnce(folderSnapshotFixture);
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Add' }));
    await user.click(screen.getByRole('menuitem', { name: 'Page Groups' }));
    await user.type(screen.getByLabelText('Page group name'), 'Utilities');
    await user.click(screen.getByRole('button', { name: /create page group/i }));

    expect(api.saveProfile).toHaveBeenCalledWith(expect.objectContaining({
      pages: expect.arrayContaining([
        expect.objectContaining({ name: 'Utilities', kind: 'folder', parentPageId: 'main' }),
      ]),
    }));
  });

  it('edits a page group from its sidebar card dialog', async () => {
    const user = userEvent.setup();
    api.getSnapshot.mockResolvedValueOnce(folderSnapshotFixture);
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /edit apps/i }));
    expect(screen.getByRole('dialog', { name: 'Edit Page Group' })).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Page group name'));
    await user.type(screen.getByLabelText('Page group name'), 'Applications');
    await user.click(screen.getByRole('button', { name: /save page group/i }));

    expect(api.saveProfile).toHaveBeenCalledWith(expect.objectContaining({
      pages: expect.arrayContaining([
        expect.objectContaining({ id: 'apps', name: 'Applications' }),
      ]),
    }));
  });

  it('restores focus to the edit trigger when the dialog closes', async () => {
    const user = userEvent.setup();
    api.getSnapshot.mockResolvedValueOnce(folderSnapshotFixture);
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /edit apps/i }));
    await user.keyboard('{Escape}');

    expect(screen.getByRole('button', { name: /edit apps/i })).toHaveFocus();
  });

  it('keeps dialog focus when a profile snapshot updates', async () => {
    const user = userEvent.setup();
    let publishSnapshot: ((snapshot: AppSnapshot) => void) | undefined;
    const captureSnapshotListener = (listener: (snapshot: AppSnapshot) => void) => {
      publishSnapshot = listener;
      return () => undefined;
    };
    api.onSnapshot.mockImplementation(captureSnapshotListener as typeof api.onSnapshot);
    api.getSnapshot.mockResolvedValueOnce(folderSnapshotFixture);
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Add' }));
    await user.click(screen.getByRole('menuitem', { name: 'Page Groups' }));
    await user.type(screen.getByLabelText('Page group name'), 'Example');
    await user.tab();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await act(async () => { publishSnapshot?.({ ...folderSnapshotFixture }); });

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('assigns a folder-open action from the folder selector', async () => {
    const user = userEvent.setup();
    api.getSnapshot.mockResolvedValueOnce(folderSnapshotFixture);
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /slot 0_1/i }));
    await user.selectOptions(screen.getByLabelText('Action group'), 'Page');
    await user.selectOptions(screen.getByLabelText('Action type'), 'page.goto');
    await user.selectOptions(screen.getByLabelText('Folder'), 'apps');
    expect(screen.getByLabelText('Folder')).toHaveValue('apps');
    await user.click(screen.getByRole('button', { name: /save slot/i }));

    expect(api.saveProfile).toHaveBeenCalledWith(expect.objectContaining({
      pages: expect.arrayContaining([
        expect.objectContaining({
          id: 'main',
          slots: expect.objectContaining({ '0_1': expect.objectContaining({ action: { type: 'page.goto', pageId: 'apps' } }) }),
        }),
      ]),
    }));
  });

  it('defaults a new folder action to the first available folder', async () => {
    const user = userEvent.setup();
    api.getSnapshot.mockResolvedValueOnce(folderSnapshotFixture);
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /slot 0_1/i }));
    await user.selectOptions(screen.getByLabelText('Action group'), 'Page');
    await user.selectOptions(screen.getByLabelText('Action type'), 'page.goto');

    expect(screen.getByLabelText('Folder')).toHaveValue('apps');
  });

  it('opens an editor for an empty folder key and refreshes after deleting the open folder', async () => {
    const user = userEvent.setup();
    api.getSnapshot
      .mockResolvedValueOnce(activeFolderSnapshotFixture)
      .mockResolvedValueOnce({
        ...folderSnapshotFixture,
        profile: { ...folderSnapshotFixture.profile, pages: [folderSnapshotFixture.profile.pages[0]] },
        activePageId: 'main',
        renderedPage: { ...folderSnapshotFixture.renderedPage, pageId: 'main' },
      });
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /slot 0_0/i }));
    await user.click(screen.getByRole('button', { name: /add action/i }));
    expect(screen.getByRole('button', { name: /save slot/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    await user.click(screen.getByRole('button', { name: /delete apps/i }));

    expect(await screen.findByText('No page groups yet.')).toBeInTheDocument();
    expect(api.getSnapshot).toHaveBeenCalledTimes(2);
  });

  it('assigns a Back action without an extra field', async () => {
    const user = userEvent.setup();
    api.getSnapshot.mockResolvedValueOnce(folderSnapshotFixture);
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /slot 0_1/i }));
    await user.selectOptions(screen.getByLabelText('Action group'), 'Page');
    await user.selectOptions(screen.getByLabelText('Action type'), 'page.back');
    expect(screen.queryByLabelText('Folder')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /save slot/i }));

    expect(api.saveProfile).toHaveBeenCalledWith(expect.objectContaining({
      pages: expect.arrayContaining([
        expect.objectContaining({
          id: 'main',
          slots: expect.objectContaining({ '0_1': expect.objectContaining({ action: { type: 'page.back' } }) }),
        }),
      ]),
    }));
  });
});
