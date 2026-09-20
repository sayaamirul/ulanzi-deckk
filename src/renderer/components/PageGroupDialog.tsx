import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

type Props = {
  mode: 'create' | 'edit';
  initialName?: string;
  returnFocusRef?: { current: HTMLElement | null };
  onClose: () => void;
  onSubmit: (name: string) => void;
};

export const PageGroupDialog = ({ mode, initialName = '', returnFocusRef, onClose, onSubmit }: Props) => {
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const title = mode === 'create' ? 'Add Page Group' : 'Edit Page Group';
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = returnFocusRef?.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : undefined);
    inputRef.current?.focus();
    const focusable = () => dialog
      ? Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'))
      : [];
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      if (elements.length === 0) return;
      const first = elements[0]!;
      const last = elements[elements.length - 1]!;
      const active = document.activeElement;
      if (!dialog?.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [onClose, returnFocusRef]);

  return (
    <div className="page-group-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section
        className="page-group-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="page-group-dialog-title"
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
            <button className="icon-button" type="button" aria-label="Close dialog" title="Close" onClick={onClose}><X aria-hidden="true" /></button>
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
