import { describe, expect, it } from 'vitest';
import { ProfileEngine } from '../../src/domain/profile/engine';
import type { Profile } from '../../src/domain/profile/types';

const profileFixture: Profile = {
  version: 1,
  id: 'stream-control',
  name: 'Stream Control',
  activePageId: 'main',
  pages: [{
    id: 'main',
    name: 'Main',
    slots: {
      '0_0': {
        id: '0_0',
        label: 'Stream',
        action: { type: 'obs.stream.toggle' },
        inactive: { label: 'Start stream' },
        active: { label: 'Live' },
        activeWhen: { kind: 'boolean', key: 'streaming', value: true },
      },
    },
  }],
};

describe('profile engine', () => {
  const engine = new ProfileEngine();

  it('resolves a configured slot on the active page', () => {
    const slot = engine.resolveSlot(profileFixture, 'main', '0_0');
    expect(slot?.action).toEqual({ type: 'obs.stream.toggle' });
  });

  it('selects the active visual when OBS is streaming', () => {
    const page = engine.renderPage(profileFixture, 'main', {
      obs: {
        connected: true,
        streaming: true,
        recording: false,
        replayBuffer: false,
        mutedInputs: {},
      },
      device: { status: 'connected' },
    });

    expect(page.slots['0_0'].visual).toBe('active');
    expect(page.slots['0_0'].label).toBe('Live');
  });

  it('renders unconfigured slots as empty', () => {
    const page = engine.renderPage(profileFixture, 'main', {
      obs: {
        connected: false,
        streaming: false,
        recording: false,
        replayBuffer: false,
        mutedInputs: {},
      },
      device: { status: 'disconnected' },
    });

    expect(page.slots['2_2'].visual).toBe('empty');
  });
});
