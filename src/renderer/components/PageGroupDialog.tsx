import { useEffect, useRef, useState } from 'react';

type Props = {
  mode: 'create' | 'edit';
  initialName?: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
};

export const PageGroupDialog = ({ mode, initialName = '', onClose, onSubmit }: Props) => {
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);
  const title = mode === 'create' ? 'Add Page Group' : 'Edit Page Group';
  const CloseIcon = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="page-group-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section
        className="page-group-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="page-group-dialog-title"
        onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}
      >
        <form
          className="page-group-dialog-content"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmedName = name.trim();
            if (trimmedName) onSubmit(trimmedName);
          }}
        >
          <div className="page-group-dialog-heading">
            <div>
              <p className="eyebrow">PAGE GROUPS</p>
              <h2 id="page-group-dialog-title">{title}</h2>
            </div>
            <button className="icon-button" type="button" aria-label="Close dialog" title="Close" onClick={onClose}><CloseIcon /></button>
          </div>
          <label>
            Page group name
            <input ref={inputRef} aria-label="Page group name" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <div className="page-group-dialog-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button className="primary-button" type="submit" disabled={!name.trim()}>
              {mode === 'create' ? 'Create page group' : 'Save page group'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
