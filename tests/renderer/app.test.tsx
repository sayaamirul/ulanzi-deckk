// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
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
};

describe('profile editor', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'ulanzi', { configurable: true, value: api });
  });

  it('shows all thirteen configurable D200H slots', async () => {
    render(<App />);

    expect(await screen.findAllByRole('button', { name: /slot/i })).toHaveLength(13);
    expect(screen.queryByText('2_4')).not.toBeInTheDocument();
  });

  it('saves an OBS scene action from the slot editor', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /slot 0_0/i }));
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
});
