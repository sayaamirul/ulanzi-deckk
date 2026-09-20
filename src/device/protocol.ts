export const FRAME_SIZE = 1024;
export const FRAME_HEADER_SIZE = 8;
export const FRAME_PAYLOAD_SIZE = FRAME_SIZE - FRAME_HEADER_SIZE;
export const MAGIC = Buffer.from([0x7c, 0x7c]);

export type ParsedFrameEvent =
  | { kind: 'button'; index: number; pressed: boolean }
  | { kind: 'device-info'; value: string }
  | { kind: 'archive-ack' }
  | { kind: 'heartbeat' };

export type ParsedFrame = {
  command: number;
  payload: Buffer;
  event?: ParsedFrameEvent;
};

export const encodeFrame = (command: number, payload: Buffer): Buffer => {
  if (payload.length > FRAME_PAYLOAD_SIZE) {
    throw new RangeError(`payload is too large: ${payload.length}`);
  }

  const frame = Buffer.alloc(FRAME_SIZE);
  MAGIC.copy(frame, 0);
  frame.writeUInt16BE(command, 2);
  frame.writeUInt32LE(payload.length, 4);
  payload.copy(frame, FRAME_HEADER_SIZE);
  return frame;
};

export const encodeArchiveReports = (archive: Buffer): Buffer[] => {
  if (archive.length === 0) throw new RangeError('archive cannot be empty');

  const first = Buffer.alloc(FRAME_SIZE);
  MAGIC.copy(first, 0);
  first.writeUInt16BE(0x0001, 2);
  first.writeUInt32LE(archive.length, 4);
  archive.copy(first, FRAME_HEADER_SIZE, 0, FRAME_PAYLOAD_SIZE);

  const reports = [first];
  for (let offset = FRAME_PAYLOAD_SIZE; offset < archive.length; offset += FRAME_SIZE) {
    const report = Buffer.alloc(FRAME_SIZE);
    archive.copy(report, 0, offset, offset + FRAME_SIZE);
    reports.push(report);
  }
  return reports;
};

export const decodeFrame = (packet: Buffer): ParsedFrame => {
  if (packet.length < FRAME_HEADER_SIZE) throw new Error('frame is too short');
  if (!packet.subarray(0, 2).equals(MAGIC)) throw new Error('invalid frame magic');

  const command = packet.readUInt16BE(2);
  const payloadLength = packet.readUInt32LE(4);
  if (payloadLength > FRAME_PAYLOAD_SIZE || FRAME_HEADER_SIZE + payloadLength > packet.length) {
    throw new Error(`invalid frame payload length: ${payloadLength}`);
  }

  const payload = Buffer.from(packet.subarray(FRAME_HEADER_SIZE, FRAME_HEADER_SIZE + payloadLength));
  let event: ParsedFrameEvent | undefined;
  if (command === 0x0101 && payload.length >= 4) {
    event = { kind: 'button', index: payload[1], pressed: payload[3] === 0x01 };
  } else if (command === 0x010b) {
    event = { kind: 'archive-ack' };
  } else if (command === 0x0103) {
    event = { kind: 'heartbeat' };
  } else if (command === 0x0303) {
    event = { kind: 'device-info', value: payload.toString('ascii').replace(/\0.*$/, '') };
  }

  return { command, payload, event };
};
