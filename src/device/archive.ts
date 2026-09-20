import JSZip from 'jszip';
import sharp from 'sharp';
import type { RenderedSlot } from '../domain/profile/types';

const TILE_SIZE = 196;

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
    .png()
    .toBuffer();
};

const buildArchive = async (slots: RenderedSlot[]): Promise<Buffer> => {
  const zip = new JSZip();
  const manifest: Record<string, { Icon: string }> = {};
  zip.file('dummy.txt', '');

  for (const slot of slots) {
    const iconPath = `icons/${slot.id}.png`;
    manifest[slot.id] = { Icon: iconPath };
    zip.file(iconPath, await normalizeTile(slot));
  }

  zip.file('manifest.json', JSON.stringify(manifest));
  zip.file('sentinel.txt', '');
  return zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });
};

export const buildButtonArchive = (slots: RenderedSlot[]): Promise<Buffer> => buildArchive(slots);
export const buildPartialButtonArchive = (slots: RenderedSlot[]): Promise<Buffer> => buildArchive(slots);
