import { useState } from 'react';
import type { Page, Slot } from '../../domain/profile/types';
import { ActionEditor } from './ActionEditor';

type Props = {
  slot: Slot;
  folders: Page[];
  onSave: (slot: Slot) => void;
  onCancel: () => void;
};

export const SlotEditor = ({ slot, folders, onSave, onCancel }: Props) => {
  const [draft, setDraft] = useState<Slot>(slot);
  const update = (value: Partial<Slot>) => setDraft((current) => ({ ...current, ...value }));

  return (
    <aside className="slot-editor" aria-label="Slot editor">
      <div className="editor-heading">
        <div>
          <p className="eyebrow">EDIT SLOT {draft.id}</p>
          <h2>{draft.label || 'New button'}</h2>
        </div>
        <button type="button" onClick={onCancel}>Close</button>
      </div>
      <label>
        Button label
        <input aria-label="Button label" value={draft.label} onChange={(event) => update({ label: event.target.value })} />
      </label>
      <ActionEditor action={draft.action} folders={folders} onChange={(action) => update({ action })} />
      <div className="editor-actions">
        <button className="primary-button" type="button" onClick={() => onSave(draft)}>Save slot</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </aside>
  );
};
