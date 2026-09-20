export type Action =
  | { type: 'obs.scene.set'; sceneName: string }
  | { type: 'obs.source.visibility.toggle'; sceneName: string; sourceName: string }
  | { type: 'obs.stream.toggle' }
  | { type: 'obs.record.toggle' }
  | { type: 'obs.replay.toggle' }
  | { type: 'obs.input.mute.toggle'; inputName: string }
  | { type: 'obs.transition.trigger'; transitionName?: string }
  | { type: 'system.launch'; executable: string; args: string[] }
  | { type: 'system.open'; target: string }
  | { type: 'system.shortcut'; accelerator: string }
  | { type: 'system.shell'; command: string }
  | { type: 'page.goto'; pageId: string }
  | { type: 'page.back' };
