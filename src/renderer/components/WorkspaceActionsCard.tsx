import type { Ref } from 'react';

type Props = {
  onConnectObs: () => void;
  onOpenSettings: () => void;
  settingsButtonRef?: Ref<HTMLButtonElement>;
};

const ConnectIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M8 12h8" />
    <path d="M7 7H5a3 3 0 0 0 0 6h2" />
    <path d="M17 11h2a3 3 0 0 1 0 6h-2" />
  </svg>
);

const SettingsIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
    <path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .6v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.6l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.6-3h-.2a1.8 1.8 0 0 1 0-3h.2a1.8 1.8 0 0 0 .6-3l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.6v-.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3 .6l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .6 3h.2a1.8 1.8 0 0 1 0 3h-.2a1.8 1.8 0 0 0-.6 3Z" />
  </svg>
);

export const WorkspaceActionsCard = ({ onConnectObs, onOpenSettings, settingsButtonRef }: Props) => (
  <section className="workspace-actions-card" aria-label="Workspace actions">
    <button className="icon-button" type="button" aria-label="Connect OBS" title="Connect OBS" onClick={onConnectObs}>
      <ConnectIcon />
    </button>
    <button ref={settingsButtonRef} className="icon-button" type="button" aria-label="Settings" title="Settings" onClick={onOpenSettings}>
      <SettingsIcon />
    </button>
  </section>
);
