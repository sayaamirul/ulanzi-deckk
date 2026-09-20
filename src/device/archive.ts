import JSZip from 'jszip';
import sharp from 'sharp';
import type { RenderedSlot } from '../domain/profile/types';

const TILE_SIZE = 196;
export const MAX_ARCHIVE_SIZE = 196_000;

type WireSlot = {
  Action: 'com.ulanzi.ulanzideck.system.open';
  ActionParam: { Path: '' };
  LinkedTitle: true;
  Name: string;
  State: 0;
  ViewParam: [{ Icon: string }];
};

const escapeXml = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const textTile = (slot: RenderedSlot): Buffer => {
  const background = slot.background ?? '#151923';
  const label = escapeXml(slot.label.slice(0, 18));
  const svg = `<svg width="${TILE_SIZE}" height="${TILE_SIZE}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${background}"/><text x="98" y="104" fill="#ffffff" font-family="sans-serif" font-size="24" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`;
  return Buffer.from(svg);
};

const normalizeTile = async (slot: RenderedSlot): Promise<Buffer> => {
  const source = slot.png.length > 0 ? slot.png : textTile(slot);
  return sharp(source)
    .resize(TILE_SIZE, TILE_SIZE, { fit: 'cover' })
    .flatten({ background: slot.background ?? '#151923' })
    .png({ compressionLevel: 9 })
    .toBuffer();
};

const wireSlotId = (id: RenderedSlot['id']): string => {
  const [row, column] = id.split('_');
  return `${column}_${row}`;
};

export const assertArchiveSize = (archive: Buffer): void => {
  if (archive.length > MAX_ARCHIVE_SIZE) {
    throw new RangeError(`D200H page archive exceeds ${MAX_ARCHIVE_SIZE} bytes`);
  }
};

const buildArchive = async (slots: RenderedSlot[]): Promise<Buffer> => {
  const zip = new JSZip();
  const images = zip.folder('Images')!;
  const manifest: Record<string, WireSlot> = {};

  for (const slot of slots) {
    if (slot.visual === 'empty') continue;
    const iconPath = `Images/${slot.id}.png`;
    manifest[wireSlotId(slot.id)] = {
      Action: 'com.ulanzi.ulanzideck.system.open',
      ActionParam: { Path: '' },
      LinkedTitle: true,
      Name: slot.label,
      State: 0,
      ViewParam: [{ Icon: iconPath }],
    };
    images.file(`${slot.id}.png`, await normalizeTile(slot));
  }

  zip.file('manifest.json', JSON.stringify(manifest));
  const archive = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
  assertArchiveSize(archive);
  return archive;
};

export const buildButtonArchive = (slots: RenderedSlot[]): Promise<Buffer> => buildArchive(slots);
export const buildPartialButtonArchive = (slots: RenderedSlot[]): Promise<Buffer> => buildArchive(slots);
