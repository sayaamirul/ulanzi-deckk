import { describe, expect, it } from 'vitest';
import { ObsAdapter } from '../../src/actions/obs/adapter';
import { FakeObsClient } from '../fakes/fake-obs';

describe('OBS adapter', () => {
  it('maps a scene action to SetCurrentProgramScene', async () => {
    const obs = new FakeObsClient();
    const adapter = new ObsAdapter(obs);
    await adapter.connect({ url: 'ws://127.0.0.1:4455' });

    await adapter.execute({ type: 'obs.scene.set', sceneName: 'Starting Soon' });

    expect(obs.requests).toContainEqual({
      requestType: 'SetCurrentProgramScene',
      requestData: { sceneName: 'Starting Soon' },
    });
  });

  it('normalizes stream state events', async () => {
    const obs = new FakeObsClient();
    const adapter = new ObsAdapter(obs);
    await adapter.connect({ url: 'ws://127.0.0.1:4455' });

    obs.emit({ eventType: 'StreamStateChanged', eventData: { outputActive: true } });

    expect(adapter.getState().streaming).toBe(true);
  });

  it('maps recording and mute actions', async () => {
    const obs = new FakeObsClient();
    const adapter = new ObsAdapter(obs);
    await adapter.connect({ url: 'ws://127.0.0.1:4455' });

    await adapter.execute({ type: 'obs.record.toggle' });
    await adapter.execute({ type: 'obs.input.mute.toggle', inputName: 'Mic/Aux' });

    expect(obs.requests.map((request) => request.requestType)).toEqual(expect.arrayContaining([
      'StartRecord',
      'GetInputMute',
    ]));
  });
});
