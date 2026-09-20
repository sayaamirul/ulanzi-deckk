import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Slot, SlotId } from '../domain/profile/types';
import { createFolderPage, folderPages, isFolderPage, topLevelPages } from '../domain/profile/navigation';
import type { Profile } from '../domain/profile/types';
import type { AppSnapshot } from '../main/runtime';
import { ulanziApi } from './api';
import { DeviceGrid } from './components/DeviceGrid';
import { PageTabs } from './components/PageTabs';
import { PageBreadcrumbs } from './components/PageBreadcrumbs';
import { ProfileToolbar } from './components/ProfileToolbar';
import { ProfileDialog } from './components/ProfileDialog';
import { PageManager } from './components/PageManager';
import { PageGroupDialog } from './components/PageGroupDialog';
import { SettingsPage } from './components/SettingsPage';
import { SlotEditor } from './components/SlotEditor';
import { WorkspaceActionsCard } from './components/WorkspaceActionsCard';
import { applyTheme, normalizeThemePreference, subscribeToSystemTheme } from './theme';
import type { ThemePreference } from './theme';

type PageGroupDialogState =
  | { mode: 'create' }
  | { mode: 'edit'; pageId: string };

type ProfileDialogState = { mode: 'create' | 'duplicate' };

const App = () => {
  const api = ulanziApi();
  const [snapshot, setSnapshot] = useState<AppSnapshot>();
  const [screen, setScreen] = useState<'workspace' | 'settings'>('workspace');
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const [themeSaveError, setThemeSaveError] = useState<string>();
  const [prefersDark, setPrefersDark] = useState(true);
  const [selectedSlotId, setSelectedSlotId] = useState<SlotId>();
  const [pageGroupDialog, setPageGroupDialog] = useState<PageGroupDialogState>();
  const [profileDialog, setProfileDialog] = useState<ProfileDialogState>();
  const [profileDialogError, setProfileDialogError] = useState<string>();
  const [profileSwitchError, setProfileSwitchError] = useState<string>();
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const pageGroupAddButtonRef = useRef<HTMLButtonElement>(null);
  const pageGroupTriggerRef = useRef<HTMLElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const addMenuItemRef = useRef<HTMLButtonElement>(null);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const profileDialogTriggerRef = useRef<HTMLElement>(null);
  const userSelectedThemeRef = useRef(false);
  const themeSaveRequestRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    void api.getPreferences()
      .then((preferences) => {
        if (mounted && !userSelectedThemeRef.current) {
          setThemePreference(normalizeThemePreference(preferences.theme));
        }
      })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, [api]);

  useEffect(() => subscribeToSystemTheme(themePreference, setPrefersDark), [themePreference]);

  useEffect(() => {
    applyTheme(document.documentElement, themePreference, prefersDark);
  }, [prefersDark, themePreference]);

  useEffect(() => {
    if (!isAddMenuOpen) return undefined;
    addMenuItemRef.current?.focus();
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!addMenuRef.current?.contains(event.target as Node)) {
        setIsAddMenuOpen(false);
        pageGroupAddButtonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [isAddMenuOpen]);

  useEffect(() => {
    let mounted = true;
    void api.getSnapshot().then((next) => { if (mounted) setSnapshot(next); });
    const unsubscribe = api.onSnapshot((next) => { if (mounted) setSnapshot(next); });
    return () => { mounted = false; unsubscribe(); };
  }, [api]);

  const page = useMemo(() => snapshot?.profile.pages.find((candidate) => candidate.id === snapshot.activePageId), [snapshot]);
  const selectedSlot = selectedSlotId && page ? page.slots[selectedSlotId] : undefined;
  const closePageGroupDialog = useCallback(() => setPageGroupDialog(undefined), []);
  const closeProfileDialog = useCallback(() => {
    setProfileDialog(undefined);
    setProfileDialogError(undefined);
  }, []);

  if (!snapshot || !page) {
    return <main className="app-shell"><p className="muted">Loading profile…</p></main>;
  }

  const openSlot = (slotId: SlotId) => {
    setSelectedSlotId(slotId);
  };

  const saveSlot = async (slot: Slot) => {
    const nextProfile = structuredClone(snapshot.profile);
    const nextPage = nextProfile.pages.find((candidate) => candidate.id === snapshot.activePageId);
    if (!nextPage) return;
    nextPage.slots[slot.id] = slot;
    await api.saveProfile(nextProfile);
    setSnapshot({ ...snapshot, profile: nextProfile });
    setSelectedSlotId(undefined);
  };

  const renameProfile = (name: string) => setSnapshot({ ...snapshot, profile: { ...snapshot.profile, name } });
  const saveProfile = async (profile: Profile = snapshot.profile) => {
    await api.saveProfile(profile);
    setSnapshot(await api.getSnapshot());
  };
  const savePageGroup = async (name: string) => {
    const nextProfile = structuredClone(snapshot.profile);
    if (pageGroupDialog?.mode === 'create') {
      const parentPageId = isFolderPage(page) ? page.parentPageId : page.id;
      if (!parentPageId) return;
      await saveProfile(createFolderPage(nextProfile, parentPageId, name, `folder-${crypto.randomUUID()}`));
    } else if (pageGroupDialog?.mode === 'edit') {
      nextProfile.pages = nextProfile.pages.map((candidate) => candidate.id === pageGroupDialog.pageId
        ? { ...candidate, name }
        : candidate);
      await saveProfile(nextProfile);
    }
    setPageGroupDialog(undefined);
  };
  const connectObs = async () => { await api.connectObs({ url: 'ws://127.0.0.1:4455' }); };
  const selectProfile = async (profileId: string) => {
    setProfileSwitchError(undefined);
    try {
      await api.selectProfile(profileId);
      setSelectedSlotId(undefined);
      setPageGroupDialog(undefined);
    } catch (error) {
      setProfileSwitchError(error instanceof Error ? error.message : String(error));
    }
  };
  const openProfileDialog = (mode: ProfileDialogState['mode']) => {
    profileDialogTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setProfileDialogError(undefined);
    setProfileDialog({ mode });
  };
  const submitProfileDialog = async (name: string) => {
    if (!profileDialog) return;
    try {
      await api.createProfile({
        name,
        ...(profileDialog.mode === 'duplicate' ? { duplicateFromId: snapshot.profile.id } : {}),
      });
      setProfileDialog(undefined);
      setProfileDialogError(undefined);
      setSelectedSlotId(undefined);
      setPageGroupDialog(undefined);
    } catch (error) {
      setProfileDialogError(error instanceof Error ? error.message : String(error));
    }
  };
  const saveThemePreference = async (nextTheme: ThemePreference) => {
    const requestId = themeSaveRequestRef.current + 1;
    themeSaveRequestRef.current = requestId;
    userSelectedThemeRef.current = true;
    setThemePreference(nextTheme);
    setThemeSaveError(undefined);
    try {
      await api.savePreferences({ theme: nextTheme, activeProfileId: snapshot.activeProfileId });
    } catch {
      if (themeSaveRequestRef.current === requestId) {
        setThemeSaveError('Could not save your theme preference.');
      }
    }
  };
  const returnToWorkspace = () => {
    setScreen('workspace');
    queueMicrotask(() => settingsTriggerRef.current?.focus());
  };
  const parentPage = isFolderPage(page)
    ? snapshot.profile.pages.find((candidate) => candidate.id === page.parentPageId)
    : undefined;
  const selectableFolders = !isFolderPage(page) ? folderPages(snapshot.profile, page.id) : [];

  return (
    <>
      <div hidden={screen === 'settings'} aria-hidden={screen === 'settings'}>
        <main className="workspace-shell">
      <ProfileToolbar
        profileName={snapshot.profile.name}
        onNameChange={renameProfile}
        onSave={() => { void saveProfile(); }}
        profiles={snapshot.profiles}
        activeProfileId={snapshot.activeProfileId}
        device={snapshot.device}
        obs={snapshot.obs}
        onSelectProfile={(profileId) => { void selectProfile(profileId); }}
        onCreateProfile={() => openProfileDialog('create')}
        onDuplicateProfile={() => openProfileDialog('duplicate')}
      />
      {profileSwitchError && <p className="profile-switch-error" role="alert">{profileSwitchError}</p>}
      <div className="workspace-body">
        <section className="layout-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">DEVICE LAYOUT</p>
              <h1>Build your stream surface</h1>
            </div>
            <div className="panel-heading-actions">
              <span className="panel-meta">13 programmable keys</span>
              <div ref={addMenuRef} className="page-group-add-menu">
                <button ref={pageGroupAddButtonRef} className="icon-button page-group-add-button" type="button" aria-label="Add" title="Add" aria-expanded={isAddMenuOpen} onClick={() => setIsAddMenuOpen((open) => !open)}>+</button>
                {isAddMenuOpen && (
                  <div
                    className="page-group-menu"
                    role="menu"
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        setIsAddMenuOpen(false);
                        pageGroupAddButtonRef.current?.focus();
                      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                        event.preventDefault();
                        addMenuItemRef.current?.focus();
                      }
                    }}
                  >
                    <button ref={addMenuItemRef} role="menuitem" type="button" onClick={() => { pageGroupTriggerRef.current = pageGroupAddButtonRef.current; setPageGroupDialog({ mode: 'create' }); setIsAddMenuOpen(false); }}>Page Groups</button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {parentPage
            ? <PageBreadcrumbs parentPage={parentPage} currentPage={page} onNavigate={(id) => { void api.selectPage(id); }} />
            : <PageTabs pages={topLevelPages(snapshot.profile)} activePageId={snapshot.activePageId} onSelect={(id) => { void api.selectPage(id); }} />}
          <DeviceGrid page={snapshot.renderedPage} selectedSlotId={selectedSlotId} onSelect={openSlot} />
        </section>
        <aside className="workspace-sidebar" aria-label="Workspace sidebar">
          {selectedSlotId && <SlotEditor key={`${snapshot.profile.id}:${snapshot.activePageId}:${selectedSlotId}`} slot={selectedSlot ? structuredClone(selectedSlot) : undefined} slotId={selectedSlotId} folders={selectableFolders} pageTargets={snapshot.profile.pages} onSave={saveSlot} onCancel={() => setSelectedSlotId(undefined)} />}
          <PageManager profile={snapshot.profile} activePageId={snapshot.activePageId} onSaveProfile={saveProfile} onSelectPage={(id) => { void api.selectPage(id); }} onEditPageGroup={(pageId, trigger) => { pageGroupTriggerRef.current = trigger; setPageGroupDialog({ mode: 'edit', pageId }); }} />
          <WorkspaceActionsCard onConnectObs={() => { void connectObs(); }} onOpenSettings={() => setScreen('settings')} settingsButtonRef={settingsTriggerRef} />
        </aside>
      </div>
      {pageGroupDialog && (
        <PageGroupDialog
          mode={pageGroupDialog.mode}
          initialName={pageGroupDialog.mode === 'edit' ? snapshot.profile.pages.find((candidate) => candidate.id === pageGroupDialog.pageId)?.name : undefined}
          returnFocusRef={pageGroupTriggerRef}
          onClose={closePageGroupDialog}
          onSubmit={(name) => { void savePageGroup(name); }}
        />
      )}
        </main>
      </div>
      {screen === 'settings' && (
        <SettingsPage
          theme={themePreference}
          saveError={themeSaveError}
          onThemeChange={(nextTheme) => { void saveThemePreference(nextTheme); }}
          onBack={returnToWorkspace}
        />
      )}
      {profileDialog && (
        <ProfileDialog
          mode={profileDialog.mode}
          initialName={profileDialog.mode === 'duplicate' ? `${snapshot.profile.name} Copy` : undefined}
          error={profileDialogError}
          returnFocusRef={profileDialogTriggerRef}
          onClose={closeProfileDialog}
          onSubmit={(name) => { void submitProfileDialog(name); }}
        />
      )}
    </>
  );
};

export default App;
