import type { Action } from '../../domain/actions/types';

type Props = {
  action: Action;
  onChange: (action: Action) => void;
};

const actionOptions: Array<{ value: Action['type']; label: string }> = [
  { value: 'obs.scene.set', label: 'OBS · Switch scene' },
  { value: 'obs.source.visibility.toggle', label: 'OBS · Toggle source' },
  { value: 'obs.stream.toggle', label: 'OBS · Toggle stream' },
  { value: 'obs.record.toggle', label: 'OBS · Toggle recording' },
  { value: 'obs.replay.toggle', label: 'OBS · Toggle replay buffer' },
  { value: 'obs.input.mute.toggle', label: 'OBS · Toggle input mute' },
  { value: 'obs.transition.trigger', label: 'OBS · Trigger transition' },
  { value: 'system.launch', label: 'System · Launch app' },
  { value: 'system.open', label: 'System · Open URL/file' },
  { value: 'system.shortcut', label: 'System · Keyboard shortcut' },
  { value: 'system.shell', label: 'System · Shell command' },
  { value: 'page.goto', label: 'Page · Go to page' },
  { value: 'page.back', label: 'Page · Back' },
];

const defaultAction = (type: Action['type']): Action => {
  switch (type) {
    case 'obs.scene.set': return { type, sceneName: '' };
    case 'obs.source.visibility.toggle': return { type, sceneName: '', sourceName: '' };
    case 'obs.stream.toggle': return { type };
    case 'obs.record.toggle': return { type };
    case 'obs.replay.toggle': return { type };
    case 'obs.input.mute.toggle': return { type, inputName: '' };
    case 'obs.transition.trigger': return { type };
    case 'system.launch': return { type, executable: '', args: [] };
    case 'system.open': return { type, target: '' };
    case 'system.shortcut': return { type, accelerator: '' };
    case 'system.shell': return { type, command: '' };
    case 'page.goto': return { type, pageId: '' };
    case 'page.back': return { type };
  }
};

export const ActionEditor = ({ action, onChange }: Props) => {
  const update = (value: Partial<Action>) => onChange({ ...action, ...value } as Action);

  return (
    <div className="action-editor">
      <label>
        Action type
        <select
          aria-label="Action type"
          value={action.type}
          onChange={(event) => onChange(defaultAction(event.target.value as Action['type']))}
        >
          {actionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>

      {action.type === 'obs.scene.set' && (
        <label>Scene name<input aria-label="Scene name" value={action.sceneName} onChange={(event) => update({ sceneName: event.target.value })} /></label>
      )}
      {action.type === 'obs.source.visibility.toggle' && (
        <>
          <label>Scene name<input aria-label="Scene name" value={action.sceneName} onChange={(event) => update({ sceneName: event.target.value })} /></label>
          <label>Source name<input aria-label="Source name" value={action.sourceName} onChange={(event) => update({ sourceName: event.target.value })} /></label>
        </>
      )}
      {action.type === 'obs.input.mute.toggle' && (
        <label>Input name<input aria-label="Input name" value={action.inputName} onChange={(event) => update({ inputName: event.target.value })} /></label>
      )}
      {action.type === 'obs.transition.trigger' && (
        <label>Transition name<input aria-label="Transition name" value={action.transitionName ?? ''} onChange={(event) => update({ transitionName: event.target.value || undefined })} /></label>
      )}
      {action.type === 'system.launch' && (
        <label>Executable<input aria-label="Executable" value={action.executable} onChange={(event) => update({ executable: event.target.value })} /></label>
      )}
      {action.type === 'system.open' && (
        <label>URL or file<input aria-label="URL or file" value={action.target} onChange={(event) => update({ target: event.target.value })} /></label>
      )}
      {action.type === 'system.shortcut' && (
        <label>Shortcut<input aria-label="Shortcut" value={action.accelerator} onChange={(event) => update({ accelerator: event.target.value })} /></label>
      )}
      {action.type === 'system.shell' && (
        <label>Shell command<textarea aria-label="Shell command" value={action.command} onChange={(event) => update({ command: event.target.value })} /></label>
      )}
      {action.type === 'page.goto' && (
        <label>Page ID<input aria-label="Page ID" value={action.pageId} onChange={(event) => update({ pageId: event.target.value })} /></label>
      )}
    </div>
  );
};
