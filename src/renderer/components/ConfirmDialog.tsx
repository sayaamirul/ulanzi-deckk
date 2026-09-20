import { useEffect, useRef, useState, type RefObject } from 'react';
import { Save, X } from 'lucide-react';
import { FormButton } from './ui/FormButton';

type Props = {
  title: string;
  description: string;
  confirmLabel: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export const ConfirmDialog = ({ title, description, confirmLabel, returnFocusRef, onClose, onConfirm }: Props) => {
  const dialogRef = useRef<HTMLElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = returnFocusRef?.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : undefined);
    cancelRef.current?.focus();
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

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="confirm-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="confirm-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description">
        <div className="confirm-dialog-content">
          <div className="confirm-dialog-heading">
            <div>
              <p className="eyebrow">SAVE PROFILE</p>
              <h2 id="confirm-dialog-title">{title}</h2>
              <p id="confirm-dialog-description" className="muted">{description}</p>
            </div>
            <FormButton className="icon-button" variant="icon" color="danger" type="button" aria-label="Close dialog" title="Close" onClick={onClose} disabled={isSubmitting}><X aria-hidden="true" /></FormButton>
          </div>
          <div className="confirm-dialog-actions">
            <FormButton ref={cancelRef} type="button" onClick={onClose} disabled={isSubmitting}>Cancel</FormButton>
            <FormButton className="primary-button" variant="solid" color="accent" type="button" onClick={() => { void handleConfirm(); }} disabled={isSubmitting}>
              <Save aria-hidden="true" />
              <span>{confirmLabel}</span>
            </FormButton>
          </div>
        </div>
      </section>
    </div>
  );
};
