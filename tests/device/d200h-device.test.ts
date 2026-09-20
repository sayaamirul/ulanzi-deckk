import { describe, expect, it } from 'vitest';
import { D200HDevice } from '../../src/device/d200h-device';
import { FakeHidTransport } from '../fakes/fake-hid';

describe('D200H device', () => {
  it('sends a full page archive on connect', async () => {
    const transport = new FakeHidTransport();
    const device = new D200HDevice(transport);

    await device.connect();

    expect(transport.writes.some((packet) => packet.command === 0x0001)).toBe(true);
  });

  it('emits configurable button presses and ignores the reserved touch area', async () => {
    const transport = new FakeHidTransport();
    const device = new D200HDevice(transport);
    const received: Array<{ index: number; pressed: boolean }> = [];
    device.onButton((event) => received.push(event));
    await device.connect();

    transport.emitButton(3, true);
    transport.emitButton(13, true);

    expect(received).toEqual([{ index: 3, pressed: true }]);
  });

  it('uses partial updates for state-only slot changes', async () => {
    const transport = new FakeHidTransport();
    const device = new D200HDevice(transport);
    await device.connect();

    await device.updateSlots([]);

    expect(transport.writes.at(-1)?.command).toBe(0x000d);
  });

  it('sends brightness as ASCII', async () => {
    const transport = new FakeHidTransport();
    const device = new D200HDevice(transport);

    await device.setBrightness(80);

    expect(transport.writes.at(-1)).toMatchObject({ command: 0x000a, payload: Buffer.from('80') });
  });
});
