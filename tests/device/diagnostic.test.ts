import { describe, expect, it } from 'vitest';
import { listD200H } from '../../src/device/diagnostic';

describe('D200H diagnostic', () => {
  it('prints a useful message when the D200H is absent', async () => {
    const result = await listD200H({ list: async () => [] });

    expect(result).toContain('D200H not found');
  });

  it('prints the matching HID path when the D200H is present', async () => {
    const result = await listD200H({
      list: async () => [{ path: '/dev/hidraw9', vendorId: 0x2207, productId: 0x0019, interface: 0 }],
    });

    expect(result).toContain('/dev/hidraw9');
    expect(result).toContain('2207:0019');
  });
});
