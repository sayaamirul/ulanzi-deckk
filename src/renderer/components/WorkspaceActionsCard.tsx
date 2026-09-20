import type { Ref } from 'react';
import { Cable, Settings } from 'lucide-react';
import { FormButton } from './ui/FormButton';

type Props = {
  onConnectObs: () => void;
  onOpenSettings: () => void;
  settingsButtonRef?: Ref<HTMLButtonElement>;
};

export const WorkspaceActionsCard = ({ onConnectObs, onOpenSettings, settingsButtonRef }: Props) => (
  <section className="workspace-actions-card" aria-label="Workspace actions">
    <FormButton className="icon-button" variant="icon" type="button" aria-label="Connect OBS" title="Connect OBS" onClick={onConnectObs}>
      <Cable aria-hidden="true" />
    </FormButton>
    <FormButton ref={settingsButtonRef} className="icon-button" variant="icon" type="button" aria-label="Settings" title="Settings" onClick={onOpenSettings}>
      <Settings aria-hidden="true" />
    </FormButton>
  </section>
);
