import type { Ref } from 'react';
import { Cable, Settings } from 'lucide-react';

type Props = {
  onConnectObs: () => void;
  onOpenSettings: () => void;
  settingsButtonRef?: Ref<HTMLButtonElement>;
};

export const WorkspaceActionsCard = ({ onConnectObs, onOpenSettings, settingsButtonRef }: Props) => (
  <section className="workspace-actions-card" aria-label="Workspace actions">
    <button className="icon-button" type="button" aria-label="Connect OBS" title="Connect OBS" onClick={onConnectObs}>
      <Cable aria-hidden="true" />
    </button>
    <button ref={settingsButtonRef} className="icon-button" type="button" aria-label="Settings" title="Settings" onClick={onOpenSettings}>
      <Settings aria-hidden="true" />
    </button>
  </section>
);
