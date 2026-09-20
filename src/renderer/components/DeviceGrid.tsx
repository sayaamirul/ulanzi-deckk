import { CONFIGURABLE_SLOT_IDS } from '../../domain/profile/types';
import type { RenderedPage } from '../../domain/profile/types';
import { FormButton } from './ui/FormButton';

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
        <FormButton
          aria-label={`Key ${index + 1}`}
          aria-pressed={isSelected}
          className={`device-slot is-${slot.visual}${isSelected ? ' is-selected' : ''}`}
          key={slotId}
          size="sm"
          type="button"
          onClick={() => onSelect(slotId)}
        >
          <span className="slot-number">{index + 1}</span>
          <strong>{slot.label || 'Empty'}</strong>
        </FormButton>
      );
    })}
  </div>
);
