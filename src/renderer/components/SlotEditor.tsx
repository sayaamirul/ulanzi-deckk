import { useState } from 'react';
import type { Page, Slot, SlotId } from '../../domain/profile/types';
import { ActionEditor } from './ActionEditor';

type Props = {
  slot?: Slot;
  slotId: SlotId;
  folders: Page[];
  pageTargets: Page[];
  onSave: (slot: Slot) => void;
  onCancel: () => void;
};

const emptySlot = (slotId: SlotId): Slot => ({
  id: slotId,
  label: '',
  action: { type: 'obs.stream.toggle' },
});

export const SlotEditor = ({ slot, slotId, folders, pageTargets, onSave, onCancel }: Props) => {
  const [draft, setDraft] = useState<Slot | undefined>(slot);
  const [isAdding, setIsAdding] = useState(Boolean(slot));
  const update = (value: Partial<Slot>) => setDraft((current) => current ? ({ ...current, ...value }) : current);
  const pageTarget = draft?.action.type === 'page.goto' ? draft.action.pageId : undefined;
  const canSave = Boolean(draft) && (draft?.action.type !== 'page.goto' || pageTargets.some((page) => page.id === pageTarget));

  return (
    <section className="slot-editor" aria-label="Slot editor">
      <div className="editor-heading">
        <div>
          <p className="eyebrow">{slot ? 'EDIT' : 'CONFIGURE'} SLOT {slotId}</p>
          <h2>{slot ? 'Edit action' : isAdding ? 'Add action' : 'Empty key'}</h2>
        </div>
        <button type="button" onClick={onCancel}>Close</button>
      </div>
      {!isAdding || !draft ? (
        <div className="empty-action-card">
          <p className="slot-id">Slot {slotId}</p>
          <h3>No action assigned</h3>
          <p className="muted">Add an action to make this key useful.</p>
          <button className="primary-button" type="button" onClick={() => { setDraft(slot ?? emptySlot(slotId)); setIsAdding(true); }}>Add action</button>
        </div>
      ) : (
        <>
          <label>
            Button label
            <input aria-label="Button label" value={draft.label} onChange={(event) => update({ label: event.target.value })} />
          </label>
          <ActionEditor action={draft.action} folders={folders} pageTargets={pageTargets} onChange={(action) => update({ action })} />
          <div className="editor-actions">
            <button className="primary-button" type="button" disabled={!canSave} onClick={() => onSave(draft)}>Save slot</button>
            <button type="button" onClick={onCancel}>Cancel</button>
          </div>
        </>
      )}
    </section>
  );
};
