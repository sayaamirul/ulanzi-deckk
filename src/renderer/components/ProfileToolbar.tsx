type Props = {
  profileName: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onConnectObs: () => void;
};

export const ProfileToolbar = ({ profileName, onNameChange, onSave, onConnectObs }: Props) => (
  <header className="profile-toolbar">
    <div>
      <p className="eyebrow">STREAM PROFILE</p>
      <input aria-label="Profile name" value={profileName} onChange={(event) => onNameChange(event.target.value)} />
    </div>
    <div className="toolbar-actions">
      <span className="toolbar-hint">D200H · OBS WebSocket</span>
      <button type="button" onClick={onConnectObs}>Connect OBS</button>
      <button className="primary-button" type="button" onClick={onSave}>Save profile</button>
    </div>
  </header>
);
