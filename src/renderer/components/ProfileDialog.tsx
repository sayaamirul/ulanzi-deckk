import { useEffect, useRef, useState, type RefObject } from 'react';
import { X } from 'lucide-react';

type Props = {
  mode: 'create' | 'duplicate';
  initialName?: string;
  error?: string;
  returnFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onSubmit: (name: string) => void;
};

export const ProfileDialog = ({ mode, initialName = '', error, returnFocusRef, onClose, onSubmit }: Props) => {
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const title = mode === 'create' ? 'Create Profile' : 'Duplicate Profile';
  const closeDialog = () => {
    onClose();
    returnFocusRef.current?.focus();
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = returnFocusRef.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : undefined);
    inputRef.current?.focus();
    const focusable = () => dialog
      ? Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'))
      : [];
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDialog();
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
    <div className="profile-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
      <section className="profile-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title">
        <form
          className="profile-dialog-content"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmedName = name.trim();
            if (trimmedName) onSubmit(trimmedName);
          }}
        >
          <div className="profile-dialog-heading">
            <div>
              <p className="eyebrow">PROFILES</p>
              <h2 id="profile-dialog-title">{title}</h2>
              <p className="muted">{mode === 'create' ? 'Start with a fresh layout.' : 'Copy the current layout into a new profile.'}</p>
            </div>
            <button className="icon-button" type="button" aria-label="Close dialog" title="Close" onClick={closeDialog}><X aria-hidden="true" /></button>
          </div>
          <label>
            Profile name
            <input
              ref={inputRef}
              aria-label="Profile name"
              aria-describedby={error ? 'profile-dialog-error' : undefined}
              aria-invalid={Boolean(error)}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          {error && <p id="profile-dialog-error" className="profile-dialog-error" role="alert">{error}</p>}
          <div className="profile-dialog-actions">
            <button type="button" onClick={closeDialog}>Cancel</button>
            <button className="primary-button" type="submit" disabled={!name.trim()}>
              {mode === 'create' ? 'Create profile' : 'Duplicate profile'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
