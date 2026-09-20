import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { Page, Slot, SlotId } from '../../domain/profile/types';
import { ActionEditor } from './ActionEditor';
import { FormButton } from './ui/FormButton';
import { FormInput } from './ui/FormInput';

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
  const labelInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isAdding && !slot) labelInputRef.current?.focus();
  }, [isAdding, slot]);
  const update = (value: Partial<Slot>) => setDraft((current) => current ? ({ ...current, ...value }) : current);
  const pageTarget = draft?.action.type === 'page.goto' ? draft.action.pageId : undefined;
  const canSave = Boolean(draft) && (draft?.action.type !== 'page.goto' || pageTargets.some((page) => page.id === pageTarget));

  return (
    <section className="slot-editor" aria-label="Action editor">
      <div className="editor-heading">
        <div>
          {slot && <p className="eyebrow">EDIT ACTION</p>}
          <h2 className={slot ? 'action-editor-title is-editing' : 'action-editor-title'}>{slot ? 'Edit action' : isAdding ? 'Add action' : 'Empty key'}</h2>
        </div>
        <FormButton className="icon-button" variant="icon" type="button" aria-label="Close" title="Close" onClick={onCancel}><X aria-hidden="true" /></FormButton>
      </div>
      {!isAdding || !draft ? (
        <div className="empty-action-card">
          <h3>No action assigned</h3>
          <p className="muted">Add an action to make this key useful.</p>
          <FormButton className="primary-button" variant="solid" color="accent" type="button" onClick={() => { setDraft(slot ?? emptySlot(slotId)); setIsAdding(true); }}>Add action</FormButton>
        </div>
      ) : (
        <>
          <label>
            Button label
            <FormInput ref={labelInputRef} aria-label="Button label" value={draft.label} onChange={(event) => update({ label: event.target.value })} />
          </label>
          <ActionEditor action={draft.action} folders={folders} pageTargets={pageTargets} onChange={(action) => update({ action })} />
          <div className="editor-actions">
            <FormButton className="primary-button" variant="solid" color="accent" type="button" disabled={!canSave} onClick={() => onSave(draft)}>Save action</FormButton>
            <FormButton type="button" onClick={onCancel}>Cancel</FormButton>
          </div>
        </>
      )}
    </section>
  );
};
