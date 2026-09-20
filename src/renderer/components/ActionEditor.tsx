import type { Action } from '../../domain/actions/types';
import type { Page } from '../../domain/profile/types';
import { FormInput } from './ui/FormInput';
import { FormSelect } from './ui/FormSelect';

type Props = {
  action: Action;
  folders?: Page[];
  pageTargets?: Page[];
  onChange: (action: Action) => void;
};

type ActionGroup = 'OBS' | 'Page' | 'System';

type ActionOption = { value: Action['type']; label: string };

const actionGroups: Record<ActionGroup, ActionOption[]> = {
  OBS: [
    { value: 'obs.scene.set', label: 'Switch scene' },
    { value: 'obs.source.visibility.toggle', label: 'Toggle source' },
    { value: 'obs.stream.toggle', label: 'Toggle stream' },
    { value: 'obs.record.toggle', label: 'Toggle recording' },
    { value: 'obs.replay.toggle', label: 'Toggle replay buffer' },
    { value: 'obs.input.mute.toggle', label: 'Toggle input mute' },
    { value: 'obs.transition.trigger', label: 'Trigger transition' },
  ],
  Page: [
    { value: 'page.goto', label: 'Open folder' },
    { value: 'page.back', label: 'Back to parent' },
  ],
  System: [
    { value: 'system.launch', label: 'Launch app' },
    { value: 'system.open', label: 'Open URL/file' },
    { value: 'system.shortcut', label: 'Keyboard shortcut' },
    { value: 'system.shell', label: 'Run shell command' },
  ],
};

const groupForAction = (type: Action['type']): ActionGroup => {
  if (type.startsWith('obs.')) return 'OBS';
  if (type.startsWith('page.')) return 'Page';
  return 'System';
};

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

export const ActionEditor = ({ action, folders = [], pageTargets = [], onChange }: Props) => {
  const update = (value: Partial<Action>) => onChange({ ...action, ...value } as Action);
  const actionGroup = groupForAction(action.type);
  const options = actionGroups[actionGroup];
  const selectAction = (type: Action['type']) => {
    const nextAction = defaultAction(type);
    if (nextAction.type === 'page.goto' && folders[0]) nextAction.pageId = folders[0].id;
    onChange(nextAction);
  };

  return (
    <div className="action-editor">
      <label>
        Action group
        <FormSelect
          aria-label="Action group"
          value={actionGroup}
          onChange={(event) => {
            const nextGroup = event.target.value as ActionGroup;
            const firstAction = actionGroups[nextGroup][0];
            if (firstAction) selectAction(firstAction.value);
          }}
        >
          {(Object.keys(actionGroups) as ActionGroup[]).map((group) => <option key={group} value={group}>{group}</option>)}
        </FormSelect>
      </label>
      <label>
        Action type
        <FormSelect
          aria-label="Action type"
          value={action.type}
          onChange={(event) => selectAction(event.target.value as Action['type'])}
        >
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </FormSelect>
      </label>

      {action.type === 'obs.scene.set' && (
        <label>Scene name<FormInput aria-label="Scene name" value={action.sceneName} onChange={(event) => update({ sceneName: event.target.value })} /></label>
      )}
      {action.type === 'obs.source.visibility.toggle' && (
        <>
          <label>Scene name<FormInput aria-label="Scene name" value={action.sceneName} onChange={(event) => update({ sceneName: event.target.value })} /></label>
          <label>Source name<FormInput aria-label="Source name" value={action.sourceName} onChange={(event) => update({ sourceName: event.target.value })} /></label>
        </>
      )}
      {action.type === 'obs.input.mute.toggle' && (
        <label>Input name<FormInput aria-label="Input name" value={action.inputName} onChange={(event) => update({ inputName: event.target.value })} /></label>
      )}
      {action.type === 'obs.transition.trigger' && (
        <label>Transition name<FormInput aria-label="Transition name" value={action.transitionName ?? ''} onChange={(event) => update({ transitionName: event.target.value || undefined })} /></label>
      )}
      {action.type === 'system.launch' && (
        <label>Executable<FormInput aria-label="Executable" value={action.executable} onChange={(event) => update({ executable: event.target.value })} /></label>
      )}
      {action.type === 'system.open' && (
        <label>URL or file<FormInput aria-label="URL or file" value={action.target} onChange={(event) => update({ target: event.target.value })} /></label>
      )}
      {action.type === 'system.shortcut' && (
        <label>Shortcut<FormInput aria-label="Shortcut" value={action.accelerator} onChange={(event) => update({ accelerator: event.target.value })} /></label>
      )}
      {action.type === 'system.shell' && (
        <label>Shell command<textarea aria-label="Shell command" value={action.command} onChange={(event) => update({ command: event.target.value })} /></label>
      )}
      {action.type === 'page.goto' && (
        <label>
          Folder
          <FormSelect aria-label="Folder" value={action.pageId} onChange={(event) => update({ pageId: event.target.value })}>
            {folders.length === 0 && <option value="">No folders available</option>}
            {action.pageId && !pageTargets.some((page) => page.id === action.pageId) && <option value={action.pageId} disabled>Invalid page: {action.pageId}</option>}
            {action.pageId && pageTargets.some((page) => page.id === action.pageId) && !folders.some((folder) => folder.id === action.pageId) && (
              <option value={action.pageId}>{pageTargets.find((page) => page.id === action.pageId)?.name ?? action.pageId}</option>
            )}
            {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
          </FormSelect>
        </label>
      )}
    </div>
  );
};
