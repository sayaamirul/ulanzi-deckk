import { CONFIGURABLE_SLOT_IDS } from '../../domain/profile/types';
import type { RenderedPage } from '../../domain/profile/types';

type Props = {
  page: RenderedPage;
  onSelect: (slotId: (typeof CONFIGURABLE_SLOT_IDS)[number]) => void;
};

export const DeviceGrid = ({ page, onSelect }: Props) => (
  <div className="device-grid" aria-label="D200H button layout">
    {CONFIGURABLE_SLOT_IDS.map((slotId) => {
      const slot = page.slots[slotId];
      return (
        <button
          aria-label={`Slot ${slotId}`}
          className={`device-slot is-${slot.visual}`}
          key={slotId}
          type="button"
          onClick={() => onSelect(slotId)}
        >
          <span className="slot-id">{slotId}</span>
          <strong>{slot.label || 'Empty'}</strong>
        </button>
      );
    })}
  </div>
);
