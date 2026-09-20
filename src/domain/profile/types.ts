import type { Action } from '../actions/types';

export const CONFIGURABLE_SLOT_IDS = [
  '0_0', '0_1', '0_2', '0_3', '0_4',
  '1_0', '1_1', '1_2', '1_3', '1_4',
  '2_0', '2_1', '2_2',
] as const;

export type SlotId = typeof CONFIGURABLE_SLOT_IDS[number];

export type SlotVisual = {
  iconPath?: string;
  label?: string;
  background?: string;
};

export type ActiveWhen =
  | { kind: 'scene'; sceneName: string }
  | { kind: 'boolean'; key: 'streaming' | 'recording' | 'replayBuffer'; value: boolean }
  | { kind: 'inputMute'; inputName: string; value: boolean };

export type Slot = {
  id: SlotId;
  label: string;
  iconPath?: string;
  action: Action;
  inactive?: SlotVisual;
  active?: SlotVisual;
  activeWhen?: ActiveWhen;
};

export type Page = {
  id: string;
  name: string;
  slots: Partial<Record<SlotId, Slot>>;
};

export type Profile = {
  version: 1;
  id: string;
  name: string;
  pages: Page[];
  activePageId: string;
};

export type RenderedSlot = {
  id: SlotId;
  visual: 'active' | 'inactive' | 'empty';
  label: string;
  iconPath?: string;
  background?: string;
  png: Buffer;
};

export type RenderedPage = {
  pageId: string;
  slots: Record<SlotId, RenderedSlot>;
};
