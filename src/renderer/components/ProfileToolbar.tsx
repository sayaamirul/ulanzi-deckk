import type { Ref } from 'react';

type Props = {
  profileName: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onConnectObs: () => void;
  onOpenSettings: () => void;
  isSettingsOpen: boolean;
  settingsButtonRef?: Ref<HTMLButtonElement>;
};

export const ProfileToolbar = ({ profileName, onNameChange, onSave, onConnectObs, onOpenSettings, isSettingsOpen, settingsButtonRef }: Props) => (
  <header className="profile-toolbar">
    <div>
      <p className="eyebrow">STREAM PROFILE</p>
      <input aria-label="Profile name" value={profileName} onChange={(event) => onNameChange(event.target.value)} />
    </div>
    <div className="toolbar-actions">
      <span className="toolbar-hint">D200H · OBS WebSocket</span>
      <button ref={settingsButtonRef} className={isSettingsOpen ? 'is-active' : undefined} type="button" aria-pressed={isSettingsOpen} onClick={onOpenSettings}>Settings</button>
      <button type="button" onClick={onConnectObs}>Connect OBS</button>
      <button className="primary-button" type="button" onClick={onSave}>Save profile</button>
    </div>
  </header>
);
