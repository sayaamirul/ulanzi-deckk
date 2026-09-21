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

  it('resets state and closes the client when initial state refresh fails', async () => {
    const obs = new FakeObsClient();
    obs.requestError = new Error('OBS request failed');
    const adapter = new ObsAdapter(obs);

    await expect(adapter.connect({ url: 'ws://127.0.0.1:4455' })).rejects.toThrow('OBS request failed');

    expect(adapter.getState().connected).toBe(false);
    expect(obs.connected).toBe(false);
    expect(obs.disconnectCalls).toBe(1);
  });

  it('stays connected when OBS has no replay buffer configured', async () => {
    const obs = new FakeObsClient();
    const replayBufferError = Object.assign(new Error('Replay buffer is not available.'), { code: 604 });
    obs.requestErrors.GetReplayBufferStatus = replayBufferError;
    const adapter = new ObsAdapter(obs);

    await expect(adapter.connect({ url: 'ws://127.0.0.1:4455' })).resolves.toBeUndefined();

    expect(adapter.getState()).toMatchObject({ connected: true, replayBuffer: false });
  });

  it('lists scene names from OBS', async () => {
    const obs = new FakeObsClient();
    obs.sceneList = ['Starting Soon', 'Live'];
    const adapter = new ObsAdapter(obs);
    await adapter.connect({ url: 'ws://127.0.0.1:4455' });

    await expect(adapter.listScenes()).resolves.toEqual(['Starting Soon', 'Live']);
    expect(obs.requests).toContainEqual({ requestType: 'GetSceneList' });
  });
});
