import { describe, expect, it } from 'vitest';
import {
  decodeFrame,
  encodeArchiveReports,
  encodeFrame,
  FRAME_SIZE,
} from '../../src/device/protocol';

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

  it('parses ZIP acknowledgements and heartbeats', () => {
    expect(decodeFrame(encodeFrame(0x010b, Buffer.alloc(0))).event).toEqual({ kind: 'archive-ack' });
    expect(decodeFrame(encodeFrame(0x0103, Buffer.alloc(0))).event).toEqual({ kind: 'heartbeat' });
  });

  it('parses device info', () => {
    const value = '{"Dversion":"2.0.3"}';
    expect(decodeFrame(encodeFrame(0x0303, Buffer.from(`${value}\0ignored`))).event).toEqual({
      kind: 'device-info',
      value,
    });
  });

  it('rejects a packet with the wrong magic bytes', () => {
    const packet = fixtureFrame(0x0101, Buffer.from([0x01, 0x03, 0x01, 0x01]));
    packet[0] = 0;

    expect(() => decodeFrame(packet)).toThrow(/magic/i);
  });

  it.each([
    { size: 1016, reports: 1 },
    { size: 1017, reports: 2 },
    { size: 1016 + 1024, reports: 2 },
    { size: 1016 + 1025, reports: 3 },
  ])('streams a $size-byte ZIP in $reports report(s)', ({ size, reports }) => {
    const archive = Buffer.from(Array.from({ length: size }, (_, index) => index % 251));
    const encoded = encodeArchiveReports(archive);

    expect(encoded).toHaveLength(reports);
    expect(encoded.every((report) => report.length === FRAME_SIZE)).toBe(true);
    expect(encoded[0].subarray(0, 4)).toEqual(Buffer.from([0x7c, 0x7c, 0x00, 0x01]));
    expect(encoded[0].readUInt32LE(4)).toBe(size);

    const reconstructed = Buffer.concat([
      encoded[0].subarray(8),
      ...encoded.slice(1),
    ]).subarray(0, size);
    expect(reconstructed).toEqual(archive);
  });

  it('rejects an empty archive', () => {
    expect(() => encodeArchiveReports(Buffer.alloc(0))).toThrow(/empty/i);
  });
});
