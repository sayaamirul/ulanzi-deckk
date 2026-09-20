import { z } from 'zod';
import { CONFIGURABLE_SLOT_IDS } from './types';
import type { Profile } from './types';

const safeAssetPath = z.string().min(1).refine(
  (value) => !value.startsWith('/') && !value.split('/').includes('..') && !value.split('\\').includes('..'),
  { message: 'asset path must stay inside the profile directory' },
);

const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('obs.scene.set'), sceneName: z.string().min(1) }),
  z.object({ type: z.literal('obs.source.visibility.toggle'), sceneName: z.string().min(1), sourceName: z.string().min(1) }),
  z.object({ type: z.literal('obs.stream.toggle') }),
  z.object({ type: z.literal('obs.record.toggle') }),
  z.object({ type: z.literal('obs.replay.toggle') }),
  z.object({ type: z.literal('obs.input.mute.toggle'), inputName: z.string().min(1) }),
  z.object({ type: z.literal('obs.transition.trigger'), transitionName: z.string().min(1).optional() }),
  z.object({ type: z.literal('system.launch'), executable: z.string().min(1), args: z.array(z.string()) }),
  z.object({ type: z.literal('system.open'), target: z.string().min(1) }),
  z.object({ type: z.literal('system.shortcut'), accelerator: z.string().min(1) }),
  z.object({ type: z.literal('system.shell'), command: z.string().min(1) }),
  z.object({ type: z.literal('page.goto'), pageId: z.string().min(1) }),
  z.object({ type: z.literal('page.back') }),
]);

const visualSchema = z.object({
  iconPath: safeAssetPath.optional(),
  label: z.string().min(1).optional(),
  background: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
});

const activeWhenSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('scene'), sceneName: z.string().min(1) }),
  z.object({
    kind: z.literal('boolean'),
    key: z.enum(['streaming', 'recording', 'replayBuffer']),
    value: z.boolean(),
  }),
  z.object({ kind: z.literal('inputMute'), inputName: z.string().min(1), value: z.boolean() }),
]);

const slotSchema = z.object({
  id: z.string().refine(
    (value) => (CONFIGURABLE_SLOT_IDS as readonly string[]).includes(value),
    { message: 'slot is reserved or unknown' },
  ),
  label: z.string().min(1),
  iconPath: safeAssetPath.optional(),
  action: actionSchema,
  inactive: visualSchema.optional(),
  active: visualSchema.optional(),
  activeWhen: activeWhenSchema.optional(),
});

const pageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(['normal', 'folder']).default('normal'),
  parentPageId: z.string().min(1).optional(),
  slots: z.record(z.string(), slotSchema).superRefine((slots, context) => {
    for (const [key, slot] of Object.entries(slots)) {
      if (!(CONFIGURABLE_SLOT_IDS as readonly string[]).includes(key)) {
        context.addIssue({ code: 'custom', path: [key], message: 'slot is reserved or unknown' });
      }
      if (key !== slot.id) {
        context.addIssue({ code: 'custom', path: [key, 'id'], message: 'slot id must match its map key' });
      }
    }
  }),
});

const profileSchema = z.object({
  version: z.literal(1),
  id: z.string().min(1),
  name: z.string().min(1),
  pages: z.array(pageSchema).min(1),
  activePageId: z.string().min(1),
}).superRefine((profile, context) => {
  if (!profile.pages.some((page) => page.id === profile.activePageId)) {
    context.addIssue({ code: 'custom', path: ['activePageId'], message: 'active page does not exist' });
  }
  const pageIds = profile.pages.map((page) => page.id);
  if (new Set(pageIds).size !== pageIds.length) {
    context.addIssue({ code: 'custom', path: ['pages'], message: 'page ids must be unique' });
  }

  const pagesById = new Map(profile.pages.map((page) => [page.id, page]));
  for (const [pageIndex, page] of profile.pages.entries()) {
    const kind = page.kind ?? 'normal';
    const parent = page.parentPageId ? pagesById.get(page.parentPageId) : undefined;
    if (kind === 'folder' && !parent) {
      context.addIssue({ code: 'custom', path: ['pages', pageIndex, 'parentPageId'], message: 'folder parent does not exist' });
    }
    if (kind === 'folder' && parent?.kind === 'folder') {
      context.addIssue({ code: 'custom', path: ['pages', pageIndex, 'parentPageId'], message: 'folders cannot contain folders' });
    }
    if (kind === 'normal' && page.parentPageId) {
      context.addIssue({ code: 'custom', path: ['pages', pageIndex, 'parentPageId'], message: 'normal pages cannot have a parent' });
    }

    for (const [slotId, slot] of Object.entries(page.slots)) {
      if (slot?.action.type !== 'page.goto') continue;
      const target = pagesById.get(slot.action.pageId);
      if (!target) {
        context.addIssue({ code: 'custom', path: ['pages', pageIndex, 'slots', slotId, 'action', 'pageId'], message: 'page navigation target does not exist' });
      } else if (target.kind === 'folder' && target.parentPageId !== page.id) {
        context.addIssue({ code: 'custom', path: ['pages', pageIndex, 'slots', slotId, 'action', 'pageId'], message: 'folder parent must match the source page' });
      }
    }
  }
});

export const parseProfile = (input: unknown): Profile => profileSchema.parse(input) as Profile;

export { actionSchema, profileSchema };
