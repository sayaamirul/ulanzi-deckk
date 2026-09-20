import { useEffect, useRef, useState, type Ref } from 'react';
import type { ProfileSummary } from '../../domain/profile/types';
import type { DeviceRuntimeState, ObsRuntimeState } from '../../domain/state/types';
import { ConnectionStatus } from './ConnectionStatus';

type Props = {
  profileName: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onConnectObs: () => void;
  onOpenSettings: () => void;
  isSettingsOpen: boolean;
  profiles: ProfileSummary[];
  activeProfileId: string;
  device: DeviceRuntimeState;
  obs: ObsRuntimeState;
  onSelectProfile: (profileId: string) => void;
  onCreateProfile: () => void;
  onDuplicateProfile: () => void;
  settingsButtonRef?: Ref<HTMLButtonElement>;
};

export const ProfileToolbar = ({
  profileName,
  onNameChange,
  onSave,
  onConnectObs,
  onOpenSettings,
  isSettingsOpen,
  profiles,
  activeProfileId,
  device,
  obs,
  onSelectProfile,
  onCreateProfile,
  onDuplicateProfile,
  settingsButtonRef,
}: Props) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isProfileMenuOpen) return undefined;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) setIsProfileMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [isProfileMenuOpen]);

  return (
    <header className="profile-toolbar">
      <div className="profile-toolbar-main">
        <p className="eyebrow">STREAM PROFILE</p>
        <div className="profile-toolbar-fields">
          <label>
            <span className="sr-only">Profile</span>
            <select aria-label="Profile" value={activeProfileId} onChange={(event) => onSelectProfile(event.target.value)}>
              {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </select>
          </label>
          <input aria-label="Profile name" value={profileName} onChange={(event) => onNameChange(event.target.value)} />
          <button className="primary-button" type="button" onClick={onSave}>Save profile</button>
          <div className="profile-actions-menu" ref={profileMenuRef}>
            <button type="button" aria-label="Profile actions" aria-expanded={isProfileMenuOpen} onClick={() => setIsProfileMenuOpen((open) => !open)}>Profile actions</button>
            {isProfileMenuOpen && (
              <div className="profile-menu" role="menu">
                <button role="menuitem" type="button" onClick={() => { setIsProfileMenuOpen(false); onCreateProfile(); }}>New profile</button>
                <button role="menuitem" type="button" onClick={() => { setIsProfileMenuOpen(false); onDuplicateProfile(); }}>Duplicate profile</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="toolbar-actions">
        <ConnectionStatus device={device} obs={obs} />
        <button type="button" onClick={onConnectObs}>Connect OBS</button>
        <button ref={settingsButtonRef} className={isSettingsOpen ? 'is-active' : undefined} type="button" aria-pressed={isSettingsOpen} onClick={onOpenSettings}>Settings</button>
      </div>
    </header>
  );
};
