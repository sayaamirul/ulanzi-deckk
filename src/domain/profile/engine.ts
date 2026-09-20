import { CONFIGURABLE_SLOT_IDS } from './types';
import type { Page, Profile, RenderedPage, RenderedSlot, Slot, SlotId } from './types';
import type { RuntimeState } from '../state/types';

const findPage = (profile: Profile, pageId: string): Page => {
  const page = profile.pages.find((candidate) => candidate.id === pageId);
  if (!page) throw new Error(`Page not found: ${pageId}`);
  return page;
};

const isActive = (slot: Slot, state: RuntimeState): boolean => {
  if (!slot.activeWhen) return false;

  if (slot.activeWhen.kind === 'scene') {
    return state.obs.currentScene === slot.activeWhen.sceneName;
  }

  if (slot.activeWhen.kind === 'boolean') {
    return state.obs[slot.activeWhen.key] === slot.activeWhen.value;
  }

  return state.obs.mutedInputs[slot.activeWhen.inputName] === slot.activeWhen.value;
};

const emptySlot = (id: SlotId): RenderedSlot => ({
  id,
  visual: 'empty',
  label: '',
  png: Buffer.alloc(0),
});

export class ProfileEngine {
  resolveSlot(profile: Profile, pageId: string, slotId: SlotId): Slot | undefined {
    return findPage(profile, pageId).slots[slotId];
  }

  renderPage(profile: Profile, pageId: string, state: RuntimeState): RenderedPage {
    const page = findPage(profile, pageId);
    const slots = Object.fromEntries(CONFIGURABLE_SLOT_IDS.map((slotId) => {
      const slot = page.slots[slotId];
      if (!slot) return [slotId, emptySlot(slotId)];

      const active = isActive(slot, state);
      const visual = active ? slot.active : slot.inactive;
      return [slotId, {
        id: slotId,
        visual: active ? 'active' : 'inactive',
        label: visual?.label ?? slot.label,
        iconPath: visual?.iconPath ?? slot.iconPath,
        background: visual?.background,
        png: Buffer.alloc(0),
      } satisfies RenderedSlot];
    }));

    return { pageId, slots: slots as RenderedPage['slots'] };
  }
}
