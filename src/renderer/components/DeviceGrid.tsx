import { CONFIGURABLE_SLOT_IDS } from '../../domain/profile/types';
import type { RenderedPage } from '../../domain/profile/types';

type Props = {
  page: RenderedPage;
  selectedSlotId?: (typeof CONFIGURABLE_SLOT_IDS)[number];
  onSelect: (slotId: (typeof CONFIGURABLE_SLOT_IDS)[number]) => void;
};

export const DeviceGrid = ({ page, selectedSlotId, onSelect }: Props) => (
  <div className="device-grid" aria-label="D200H button layout">
    {CONFIGURABLE_SLOT_IDS.map((slotId, index) => {
      const slot = page.slots[slotId];
      const isSelected = selectedSlotId === slotId;
      return (
        <button
          aria-label={`Slot ${slotId} (Key ${index + 1})`}
          aria-pressed={isSelected}
          className={`device-slot is-${slot.visual}${isSelected ? ' is-selected' : ''}`}
          key={slotId}
          type="button"
          onClick={() => onSelect(slotId)}
        >
          <span className="slot-number">{index + 1}</span>
          <strong>{slot.label || 'Empty'}</strong>
        </button>
      );
    })}
  </div>
);
