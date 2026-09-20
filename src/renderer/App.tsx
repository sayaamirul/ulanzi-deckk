import { useEffect, useMemo, useState } from 'react';
import type { Slot, SlotId } from '../domain/profile/types';
import type { AppSnapshot } from '../main/runtime';
import { ulanziApi } from './api';
import { ConnectionStatus } from './components/ConnectionStatus';
import { DeviceGrid } from './components/DeviceGrid';
import { PageTabs } from './components/PageTabs';
import { ProfileToolbar } from './components/ProfileToolbar';
import { SlotEditor } from './components/SlotEditor';

const App = () => {
  const api = ulanziApi();
  const [snapshot, setSnapshot] = useState<AppSnapshot>();
  const [selectedSlotId, setSelectedSlotId] = useState<SlotId>();

  useEffect(() => {
    let mounted = true;
    void api.getSnapshot().then((next) => { if (mounted) setSnapshot(next); });
    const unsubscribe = api.onSnapshot((next) => { if (mounted) setSnapshot(next); });
    return () => { mounted = false; unsubscribe(); };
  }, [api]);

  const page = useMemo(() => snapshot?.profile.pages.find((candidate) => candidate.id === snapshot.activePageId), [snapshot]);
  const selectedSlot = selectedSlotId && page?.slots[selectedSlotId];

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
  const saveProfile = async () => { await api.saveProfile(snapshot.profile); };
  const connectObs = async () => { await api.connectObs({ url: 'ws://127.0.0.1:4455' }); };

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
            <span className="panel-meta">13 programmable keys</span>
          </div>
          <PageTabs pages={snapshot.profile.pages} activePageId={snapshot.activePageId} onSelect={(id) => { void api.selectPage(id); }} />
          <DeviceGrid page={snapshot.renderedPage} onSelect={openSlot} />
          <p className="muted helper-text">Assign an OBS action to each key, then save the profile to push it to the D200H.</p>
        </section>
        {selectedSlot && <SlotEditor slot={structuredClone(selectedSlot)} onSave={saveSlot} onCancel={() => setSelectedSlotId(undefined)} />}
      </div>
    </main>
  );
};

export default App;
