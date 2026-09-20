import { useEffect, useMemo, useState } from 'react';
import type { Slot, SlotId } from '../domain/profile/types';
import { createFolderPage, folderPages, isFolderPage, topLevelPages } from '../domain/profile/navigation';
import type { Profile } from '../domain/profile/types';
import type { AppSnapshot } from '../main/runtime';
import { ulanziApi } from './api';
import { ConnectionStatus } from './components/ConnectionStatus';
import { DeviceGrid } from './components/DeviceGrid';
import { PageTabs } from './components/PageTabs';
import { ProfileToolbar } from './components/ProfileToolbar';
import { PageManager } from './components/PageManager';
import { PageGroupDialog } from './components/PageGroupDialog';
import { SlotEditor } from './components/SlotEditor';

type PageGroupDialogState =
  | { mode: 'create' }
  | { mode: 'edit'; pageId: string };

const App = () => {
  const api = ulanziApi();
  const [snapshot, setSnapshot] = useState<AppSnapshot>();
  const [selectedSlotId, setSelectedSlotId] = useState<SlotId>();
  const [pageGroupDialog, setPageGroupDialog] = useState<PageGroupDialogState>();
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    void api.getSnapshot().then((next) => { if (mounted) setSnapshot(next); });
    const unsubscribe = api.onSnapshot((next) => { if (mounted) setSnapshot(next); });
    return () => { mounted = false; unsubscribe(); };
  }, [api]);

  const page = useMemo(() => snapshot?.profile.pages.find((candidate) => candidate.id === snapshot.activePageId), [snapshot]);
  const selectedSlot = selectedSlotId && page ? page.slots[selectedSlotId] : undefined;

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
  const parentPage = isFolderPage(page)
    ? snapshot.profile.pages.find((candidate) => candidate.id === page.parentPageId)
    : undefined;
  const selectableFolders = !isFolderPage(page) ? folderPages(snapshot.profile, page.id) : [];

  return (
    <main className="workspace-shell">
      <ProfileToolbar
        profileName={snapshot.profile.name}
        onNameChange={renameProfile}
        onSave={() => { void saveProfile(); }}
        onConnectObs={() => { void connectObs(); }}
      />
      <ConnectionStatus device={snapshot.device} obs={snapshot.obs} />
      <div className="workspace-body">
        <section className="layout-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">DEVICE LAYOUT</p>
              <h1>Build your stream surface</h1>
            </div>
            <div className="panel-heading-actions">
              <span className="panel-meta">13 programmable keys</span>
              <div className="page-group-add-menu">
                <button className="icon-button page-group-add-button" type="button" aria-label="Add" title="Add" aria-expanded={isAddMenuOpen} onClick={() => setIsAddMenuOpen((open) => !open)}>+</button>
                {isAddMenuOpen && (
                  <div className="page-group-menu" role="menu">
                    <button role="menuitem" type="button" onClick={() => { setPageGroupDialog({ mode: 'create' }); setIsAddMenuOpen(false); }}>Page Groups</button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <PageTabs pages={topLevelPages(snapshot.profile)} activePageId={snapshot.activePageId} onSelect={(id) => { void api.selectPage(id); }} />
          {parentPage && <button type="button" onClick={() => { void api.selectPage(parentPage.id); }}>Back to {parentPage.name}</button>}
          <DeviceGrid page={snapshot.renderedPage} onSelect={openSlot} />
          <p className="muted helper-text">Assign an action to each key, then save the profile to push it to the D200H. Folder buttons open grouped shortcuts.</p>
        </section>
        <aside className="workspace-sidebar" aria-label="Workspace sidebar">
          {selectedSlotId && <SlotEditor key={`${snapshot.activePageId}:${selectedSlotId}`} slot={selectedSlot ? structuredClone(selectedSlot) : undefined} slotId={selectedSlotId} folders={selectableFolders} pageTargets={snapshot.profile.pages} onSave={saveSlot} onCancel={() => setSelectedSlotId(undefined)} />}
          <PageManager profile={snapshot.profile} activePageId={snapshot.activePageId} onSaveProfile={saveProfile} onSelectPage={(id) => { void api.selectPage(id); }} onEditPageGroup={(pageId) => setPageGroupDialog({ mode: 'edit', pageId })} />
        </aside>
      </div>
      {pageGroupDialog && (
        <PageGroupDialog
          mode={pageGroupDialog.mode}
          initialName={pageGroupDialog.mode === 'edit' ? snapshot.profile.pages.find((candidate) => candidate.id === pageGroupDialog.pageId)?.name : undefined}
          onClose={() => setPageGroupDialog(undefined)}
          onSubmit={(name) => { void savePageGroup(name); }}
        />
      )}
    </main>
  );
};

export default App;
