// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppSnapshot } from '../../src/main/runtime';
import type { AppPreferences } from '../../src/main/preferences';
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
  profiles: [
    { id: 'stream-control', name: 'Stream Control' },
    { id: 'studio', name: 'Studio' },
  ],
  activeProfileId: 'stream-control',
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
  listProfiles: vi.fn(async () => streamSnapshotFixture.profiles),
  selectProfile: vi.fn(async (_profileId: string) => undefined),
  createProfile: vi.fn(async (_input: { name: string; duplicateFromId?: string }) => undefined),
  saveProfile: vi.fn(async (_profile: AppSnapshot['profile']) => undefined),
  selectPage: vi.fn(async () => undefined),
  dispatchSlot: vi.fn(async () => undefined),
  connectObs: vi.fn(async () => undefined),
  setBrightness: vi.fn(async () => undefined),
  getPreferences: vi.fn(async (): Promise<AppPreferences> => ({ theme: 'system' })),
  savePreferences: vi.fn(async (_preferences: AppPreferences): Promise<void> => undefined),
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

const chooseSearchableOption = async (user: ReturnType<typeof userEvent.setup>, label: string, query: string, optionName: string = query) => {
  const control = screen.getByRole('combobox', { name: label });
  await user.click(control);
  await user.type(control, query);
  await user.click(screen.getByRole('option', { name: optionName }));
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

  it('keeps save beside the profile name and connection status inside the toolbar', async () => {
    render(<App />);

    const toolbar = await screen.findByRole('banner');
    const status = within(toolbar).getByLabelText('Connection status');
    const profileSelect = within(toolbar).getByRole('combobox', { name: 'Profile' });
    const profileActions = within(toolbar).getByRole('button', { name: 'Profile actions' });
    const profileName = within(toolbar).getByLabelText('Profile name');
    const save = within(toolbar).getByRole('button', { name: 'Save profile' });

    expect(toolbar).toContainElement(status);
    expect(status.parentElement).toContainElement(profileSelect);
    expect(status.compareDocumentPosition(profileSelect) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(profileSelect.compareDocumentPosition(profileActions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(profileActions.querySelector('.lucide-ellipsis')).toBeInTheDocument();
    expect(toolbar).toContainElement(save);
    expect(save.querySelector('.lucide-save')).toBeInTheDocument();
    expect(profileName.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(toolbar).queryByRole('button', { name: 'Connect OBS' })).not.toBeInTheDocument();
    expect(within(toolbar).queryByRole('button', { name: 'Settings' })).not.toBeInTheDocument();
    expect(screen.getAllByLabelText('Connection status')).toHaveLength(1);
  });

  it('places icon-only OBS and Settings actions in the sidebar card', async () => {
    const user = userEvent.setup();
    render(<App />);

    const sidebar = await screen.findByRole('complementary', { name: 'Workspace sidebar' });
    const actionsCard = within(sidebar).getByRole('region', { name: 'Workspace actions' });
    const connectButton = within(actionsCard).getByRole('button', { name: 'Connect OBS' });
    const settingsButton = within(actionsCard).getByRole('button', { name: 'Settings' });

    expect(connectButton).toHaveAttribute('title', 'Connect OBS');
    expect(settingsButton).toHaveAttribute('title', 'Settings');
    expect(connectButton.querySelector('.lucide-cable')).toBeInTheDocument();
    expect(settingsButton.querySelector('.lucide-settings')).toBeInTheDocument();
    await user.click(connectButton);
    expect(api.connectObs).toHaveBeenCalledWith({ url: 'ws://127.0.0.1:4455' });
  });

  it('lists profiles and switches the active profile from the toolbar', async () => {
    const user = userEvent.setup();
    render(<App />);

    const profileSelect = await screen.findByRole('combobox', { name: 'Profile' });
    expect(profileSelect).toHaveValue('Stream Control');
    await user.click(profileSelect);
    await user.type(profileSelect, 'Stu');
    expect(screen.getByRole('option', { name: 'Studio' })).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Studio' }));

    expect(api.selectProfile).toHaveBeenCalledWith('studio');
  });

  it('creates and duplicates profiles through the profile actions menu', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Profile actions' }));
    expect(screen.getByRole('menuitem', { name: 'New profile' }).querySelector('.lucide-plus')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Duplicate profile' }).querySelector('.lucide-copy')).toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: 'New profile' }));
    expect(screen.getByRole('heading', { name: 'Create Profile' })).toBeInTheDocument();
    await user.type(within(screen.getByRole('dialog')).getByRole('textbox', { name: 'Profile name' }), 'New Layout');
    await user.click(screen.getByRole('button', { name: 'Create profile' }));
    expect(api.createProfile).toHaveBeenCalledWith({ name: 'New Layout' });

    await user.click(screen.getByRole('button', { name: 'Profile actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Duplicate profile' }));
    expect(within(screen.getByRole('dialog')).getByRole('textbox', { name: 'Profile name' })).toHaveValue('Stream Control Copy');
    await user.click(screen.getByRole('button', { name: 'Duplicate profile' }));
    expect(api.createProfile).toHaveBeenCalledWith({ name: 'Stream Control Copy', duplicateFromId: 'stream-control' });
  });

  it('keeps the current profile and shows a dialog error when creation fails', async () => {
    const user = userEvent.setup();
    api.createProfile.mockRejectedValueOnce(new Error('Profile could not be saved'));
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Profile actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'New profile' }));
    await user.type(within(screen.getByRole('dialog')).getByRole('textbox', { name: 'Profile name' }), 'Broken');
    await user.click(screen.getByRole('button', { name: 'Create profile' }));

    expect(screen.getByRole('heading', { name: 'Create Profile' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/could not be saved/i);
    expect(screen.getByRole('combobox', { name: 'Profile' })).toHaveValue('Stream Control');
  });

  it('remounts the slot editor when switching profiles', async () => {
    const user = userEvent.setup();
    let publishSnapshot: ((snapshot: AppSnapshot) => void) | undefined;
    api.onSnapshot.mockImplementationOnce(((listener: (snapshot: AppSnapshot) => void) => {
      publishSnapshot = listener;
      return () => undefined;
    }) as typeof api.onSnapshot);
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Key 1' }));
    await user.click(screen.getByLabelText('Button label'));
    await user.clear(screen.getByLabelText('Button label'));
    await user.type(screen.getByLabelText('Button label'), 'Draft');

    const profileSelect = screen.getByRole('combobox', { name: 'Profile' });
    await user.click(profileSelect);
    await user.type(profileSelect, 'Stu');
    await user.click(screen.getByRole('option', { name: 'Studio' }));
    publishSnapshot?.({ ...streamSnapshotFixture, activeProfileId: 'studio', profile: { ...streamSnapshotFixture.profile, id: 'studio', name: 'Studio' } });

    expect(screen.queryByRole('region', { name: 'Action editor' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Key 1' }));
    expect(screen.getByLabelText('Button label')).toHaveValue('Stream');
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
    expect(api.savePreferences).toHaveBeenCalledWith({ theme: 'light', activeProfileId: 'stream-control' });
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

  it('does not let a delayed initial preference load overwrite a newer selection', async () => {
    const user = userEvent.setup();
    let resolvePreferences: ((preferences: { theme: 'light' | 'dark' | 'system' }) => void) | undefined;
    api.getPreferences.mockImplementationOnce(() => new Promise((resolve) => {
      resolvePreferences = resolve;
    }));
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('radio', { name: 'Light' }));
    expect(document.documentElement.dataset.theme).toBe('light');

    await act(async () => {
      resolvePreferences?.({ theme: 'dark' });
    });

    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('preserves an unsaved slot draft while visiting Settings', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Key 1' }));
    await user.clear(screen.getByLabelText('Button label'));
    await user.type(screen.getByLabelText('Button label'), 'Unsaved draft');
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: /back to workspace/i }));

    expect(screen.getByLabelText('Button label')).toHaveValue('Unsaved draft');
  });

  it('does not show a stale save error after a newer theme selection', async () => {
    const user = userEvent.setup();
    let rejectLight: ((error: Error) => void) | undefined;
    api.savePreferences.mockImplementation((preferences) => (
      preferences.theme === 'light'
        ? new Promise<void>((_resolve, reject) => { rejectLight = reject; })
        : Promise.resolve()
    ));
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('radio', { name: 'Light' }));
    await user.click(screen.getByRole('radio', { name: 'Dark' }));

    await act(async () => {
      rejectLight?.(new Error('stale failure'));
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
  });

  it('shows all thirteen configurable D200H slots', async () => {
    render(<App />);

    const grid = await screen.findByLabelText('D200H button layout');
    expect(within(grid).getAllByRole('button', { name: /key/i })).toHaveLength(13);
    expect(within(grid).getByText('1')).toBeInTheDocument();
    expect(within(grid).getByText('13')).toBeInTheDocument();
    expect(screen.queryByText('2_4')).not.toBeInTheDocument();
  });

  it('marks the selected grid key and moves the indicator when another key is chosen', async () => {
    const user = userEvent.setup();
    render(<App />);

    const firstKey = await screen.findByRole('button', { name: 'Key 1' });
    const secondKey = screen.getByRole('button', { name: 'Key 2' });
    expect(firstKey).toHaveAttribute('aria-pressed', 'false');

    await user.click(firstKey);
    expect(firstKey).toHaveAttribute('aria-pressed', 'true');
    expect(firstKey).toHaveClass('is-selected');
    expect(secondKey).toHaveAttribute('aria-pressed', 'false');

    await user.click(secondKey);
    expect(firstKey).toHaveAttribute('aria-pressed', 'false');
    expect(secondKey).toHaveAttribute('aria-pressed', 'true');
    expect(secondKey).toHaveClass('is-selected');
  });

  it('opens an empty action card for an unassigned key', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Key 2' }));

    expect(screen.getByRole('region', { name: 'Action editor' })).toHaveTextContent('No action assigned');
    expect(screen.queryByText('CONFIGURE ACTION')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add action/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('Action group')).not.toBeInTheDocument();
  });

  it('moves focus to the label field after starting an empty action', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Key 2' }));
    await user.click(screen.getByRole('button', { name: /add action/i }));

    expect(screen.getByLabelText('Button label')).toHaveFocus();
  });

  it('opens an assigned action directly in edit mode', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Key 1' }));

    const editor = screen.getByRole('region', { name: 'Action editor' });
    expect(editor).toHaveTextContent('Edit action');
    expect(screen.getByRole('heading', { name: 'Edit action' })).toHaveClass('action-editor-title', 'is-editing');
    const close = screen.getByRole('button', { name: 'Close' });
    expect(close.querySelector('.lucide-x')).toBeInTheDocument();
    expect(close).toHaveClass('ui-control--danger');
    expect(screen.queryByText('Slot 0_0')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Action group' })).toHaveValue('OBS');
    expect(screen.getByRole('combobox', { name: 'Action type' })).toHaveValue('Toggle stream');
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

    await user.click(await screen.findByRole('button', { name: 'Key 2' }));
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

    await user.click(await screen.findByRole('button', { name: 'Key 2' }));
    await user.click(screen.getByRole('button', { name: /add action/i }));
    await user.clear(screen.getByLabelText('Button label'));
    await user.type(screen.getByLabelText('Button label'), 'Browser');
    await chooseSearchableOption(user, 'Action group', 'system', 'System');
    await chooseSearchableOption(user, 'Action type', 'open', 'Open URL/file');
    await user.type(screen.getByLabelText('URL or file'), 'https://example.com');
    await user.click(screen.getByRole('button', { name: /save action/i }));

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

    await user.click(await screen.findByRole('button', { name: 'Key 1' }));
    await chooseSearchableOption(user, 'Action type', 'scene', 'Switch scene');
    await user.type(screen.getByLabelText('Scene name'), 'Starting Soon');
    await user.click(screen.getByRole('button', { name: /save action/i }));

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

    expect(screen.getByRole('dialog', { name: 'Overwrite profile?' })).toBeInTheDocument();
    expect(api.saveProfile).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Overwrite profile' }));

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

  it('styles the top-level Main page like a breadcrumb', async () => {
    render(<App />);

    const mainButton = await screen.findByRole('button', { name: 'Main' });
    expect(mainButton).toHaveClass('page-tab--breadcrumb');
  });

  it('removes the device layout helper copy', async () => {
    render(<App />);

    expect(await screen.findByLabelText('D200H button layout')).toBeInTheDocument();
    expect(screen.queryByText(/Assign an action to each key/i)).not.toBeInTheDocument();
  });

  it('uses a clickable Main breadcrumb inside a page group', async () => {
    const user = userEvent.setup();
    api.getSnapshot.mockResolvedValueOnce(activeFolderSnapshotFixture);
    render(<App />);

    const breadcrumbs = await screen.findByRole('navigation', { name: 'Page breadcrumbs' });
    expect(breadcrumbs).toHaveTextContent('Main');
    expect(breadcrumbs).toHaveTextContent('Apps');
    expect(screen.queryByRole('button', { name: 'Back to Main' })).not.toBeInTheDocument();

    await user.click(within(breadcrumbs).getByRole('button', { name: 'Main' }));
    expect(api.selectPage).toHaveBeenCalledWith('main');
  });

  it('opens the add page group dialog from the layout card', async () => {
    const user = userEvent.setup();
    api.getSnapshot.mockResolvedValueOnce(folderSnapshotFixture);
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Add' }));
    expect(screen.getByRole('button', { name: 'Add' })).toHaveClass('ui-control--accent');
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

    await user.click(await screen.findByRole('button', { name: 'Key 2' }));
    await chooseSearchableOption(user, 'Action group', 'page', 'Page');
    await chooseSearchableOption(user, 'Action type', 'folder', 'Open folder');
    await chooseSearchableOption(user, 'Folder', 'apps', 'Apps');
    expect(screen.getByRole('combobox', { name: 'Folder' })).toHaveValue('Apps');
    await user.click(screen.getByRole('button', { name: /save action/i }));

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

    await user.click(await screen.findByRole('button', { name: 'Key 2' }));
    await chooseSearchableOption(user, 'Action group', 'page', 'Page');
    await chooseSearchableOption(user, 'Action type', 'folder', 'Open folder');

    expect(screen.getByRole('combobox', { name: 'Folder' })).toHaveValue('Apps');
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

    await user.click(await screen.findByRole('button', { name: 'Key 1' }));
    await user.click(screen.getByRole('button', { name: /add action/i }));
    expect(screen.getByRole('button', { name: /save action/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    await user.click(screen.getByRole('button', { name: /delete apps/i }));

    expect(await screen.findByText('No page groups yet.')).toBeInTheDocument();
    expect(api.getSnapshot).toHaveBeenCalledTimes(2);
  });

  it('assigns a Back action without an extra field', async () => {
    const user = userEvent.setup();
    api.getSnapshot.mockResolvedValueOnce(folderSnapshotFixture);
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Key 2' }));
    await chooseSearchableOption(user, 'Action group', 'page', 'Page');
    await chooseSearchableOption(user, 'Action type', 'back', 'Back to parent');
    expect(screen.queryByLabelText('Folder')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /save action/i }));

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
