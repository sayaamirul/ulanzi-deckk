import { describe, expect, it } from 'vitest';
import { decodeFrame, encodeFrame } from '../../src/device/protocol';

const fixtureFrame = (command: number, payload: Buffer) => encodeFrame(command, payload);

describe('D200H protocol', () => {
  it('encodes a 1024-byte frame with reversed length bytes', () => {
    const frame = encodeFrame(0x000a, Buffer.from('80'));

    expect(frame.length).toBe(1024);
    expect(frame.subarray(0, 8)).toEqual(Buffer.from([
      0x7c, 0x7c, 0x00, 0x0a, 0x02, 0x00, 0x00, 0x00,
    ]));
  });

  it('parses a button press report', () => {
    const packet = fixtureFrame(0x0101, Buffer.from([0x01, 0x03, 0x01, 0x01]));

    expect(decodeFrame(packet).event).toEqual({ kind: 'button', index: 3, pressed: true });
  });

  it('parses a button release report', () => {
    const packet = fixtureFrame(0x0101, Buffer.from([0x01, 0x03, 0x01, 0x00]));

    expect(decodeFrame(packet).event).toEqual({ kind: 'button', index: 3, pressed: false });
  });

  it('rejects a packet with the wrong magic bytes', () => {
    const packet = fixtureFrame(0x0101, Buffer.from([0x01, 0x03, 0x01, 0x01]));
    packet[0] = 0;

    expect(() => decodeFrame(packet)).toThrow(/magic/i);
  });
});
