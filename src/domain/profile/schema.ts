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
});

export const parseProfile = (input: unknown): Profile => profileSchema.parse(input) as Profile;

export { actionSchema, profileSchema };
