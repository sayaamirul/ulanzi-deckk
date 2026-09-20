import { useEffect, useRef, useState } from 'react';
import { Copy, Ellipsis, Plus } from 'lucide-react';
import type { ProfileSummary } from '../../domain/profile/types';
import type { DeviceRuntimeState, ObsRuntimeState } from '../../domain/state/types';
import { ConnectionStatus } from './ConnectionStatus';
import { FormButton } from './ui/FormButton';
import { FormInput } from './ui/FormInput';
import { FormSelect } from './ui/FormSelect';

type Props = {
  profileName: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
  profiles: ProfileSummary[];
  activeProfileId: string;
  device: DeviceRuntimeState;
  obs: ObsRuntimeState;
  onSelectProfile: (profileId: string) => void;
  onCreateProfile: () => void;
  onDuplicateProfile: () => void;
};

export const ProfileToolbar = ({
  profileName,
  onNameChange,
  onSave,
  profiles,
  activeProfileId,
  device,
  obs,
  onSelectProfile,
  onCreateProfile,
  onDuplicateProfile,
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
          <FormInput aria-label="Profile name" value={profileName} onChange={(event) => onNameChange(event.target.value)} />
          <FormButton className="primary-button" variant="solid" color="accent" type="button" onClick={onSave}>Save profile</FormButton>
        </div>
        <p id="profile-switch-note" className="profile-toolbar-note">Switching profiles uses saved changes.</p>
      </div>
      <div className="toolbar-actions">
        <ConnectionStatus className="connection-status-compact" device={device} obs={obs} />
        <label className="profile-toolbar-active-profile">
          <span className="sr-only">Profile</span>
          <FormSelect searchable size="sm" aria-label="Profile" aria-describedby="profile-switch-note" value={activeProfileId} onChange={(event) => onSelectProfile(event.target.value)}>
            {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
          </FormSelect>
        </label>
        <div className="profile-actions-menu" ref={profileMenuRef}>
          <FormButton className="icon-button" variant="icon" type="button" aria-label="Profile actions" title="Profile actions" aria-expanded={isProfileMenuOpen} onClick={() => setIsProfileMenuOpen((open) => !open)}><Ellipsis aria-hidden="true" /></FormButton>
          {isProfileMenuOpen && (
            <div className="profile-menu" role="menu">
                <FormButton role="menuitem" type="button" onClick={() => { setIsProfileMenuOpen(false); onCreateProfile(); }}><Plus aria-hidden="true" /> <span>New profile</span></FormButton>
                <FormButton role="menuitem" type="button" onClick={() => { setIsProfileMenuOpen(false); onDuplicateProfile(); }}><Copy aria-hidden="true" /> <span>Duplicate profile</span></FormButton>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
