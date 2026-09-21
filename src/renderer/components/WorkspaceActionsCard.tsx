import type { Ref } from 'react';
import { Cable, Settings } from 'lucide-react';
import { FormButton } from './ui/FormButton';

type Props = {
  onConnectObs: () => void;
  onOpenSettings: () => void;
  settingsButtonRef?: Ref<HTMLButtonElement>;
  isConnectingObs: boolean;
  obsConnected: boolean;
  obsConnectionError?: string;
};

export const WorkspaceActionsCard = ({ onConnectObs, onOpenSettings, settingsButtonRef, isConnectingObs, obsConnected, obsConnectionError }: Props) => (
  <section className="workspace-actions-card" aria-label="Workspace actions">
    <div className="workspace-actions-status">
      <span
        className={`workspace-actions-status-label${obsConnected ? ' is-online' : ''}${obsConnectionError ? ' is-error' : ''}`}
        role="status"
        aria-live="polite"
      >
        {isConnectingObs ? 'Connecting to OBS…' : obsConnected ? 'OBS connected' : obsConnectionError ? 'OBS connection failed' : 'OBS disconnected'}
      </span>
      {obsConnectionError && <span className="workspace-actions-error" role="alert">{obsConnectionError}</span>}
    </div>
    <FormButton className="icon-button" variant="icon" type="button" aria-label="Connect OBS" title="Connect OBS" aria-busy={isConnectingObs} disabled={isConnectingObs} onClick={onConnectObs}>
      <Cable aria-hidden="true" />
    </FormButton>
    <FormButton ref={settingsButtonRef} className="icon-button" variant="icon" type="button" aria-label="Settings" title="Settings" onClick={onOpenSettings}>
      <Settings aria-hidden="true" />
    </FormButton>
  </section>
);
