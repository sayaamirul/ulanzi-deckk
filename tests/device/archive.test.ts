import JSZip from 'jszip';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  assertArchiveSize,
  buildButtonArchive,
  buildPartialButtonArchive,
  MAX_ARCHIVE_SIZE,
} from '../../src/device/archive';
import type { RenderedSlot } from '../../src/domain/profile/types';

const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

const slot = (id: RenderedSlot['id'], label: string, visual: RenderedSlot['visual'] = 'inactive'): RenderedSlot => ({
  id,
  visual,
  label,
  png: visual === 'empty' ? Buffer.alloc(0) : onePixelPng,
});

describe('D200H button archives', () => {
  it('creates the firmware manifest with transposed wire keys and omits empty slots', async () => {
    const archive = await buildButtonArchive([
      slot('0_1', 'Top second'),
      slot('1_0', 'Middle first'),
      slot('2_2', '', 'empty'),
    ]);
    const zip = await JSZip.loadAsync(archive);
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string')) as Record<string, unknown>;

    expect(Object.keys(manifest).sort()).toEqual(['0_1', '1_0']);
    expect(manifest['1_0']).toEqual({
      Action: 'com.ulanzi.ulanzideck.system.open',
      ActionParam: { Path: '' },
      LinkedTitle: true,
      Name: 'Top second',
      State: 0,
      ViewParam: [{ Icon: 'Images/0_1.png' }],
    });
    expect(zip.folder('Images')).not.toBeNull();
    expect(zip.file('Images/0_1.png')).not.toBeNull();
    expect(zip.file('Images/1_0.png')).not.toBeNull();
    expect(zip.file('Images/2_2.png')).toBeNull();
    expect(zip.file('dummy.txt')).toBeNull();
    expect(zip.file('sentinel.txt')).toBeNull();
  });

  it('stores opaque 196 by 196 PNG icons', async () => {
    const archive = await buildButtonArchive([slot('0_0', 'Start stream')]);
    const zip = await JSZip.loadAsync(archive);
    const png = await zip.file('Images/0_0.png')!.async('nodebuffer');
    const metadata = await sharp(png).metadata();

    expect(metadata).toMatchObject({ width: 196, height: 196, hasAlpha: false });
  });

  it('applies the same verified format to requested state updates', async () => {
    const archive = await buildPartialButtonArchive([slot('1_1', 'Mute mic')]);
    const zip = await JSZip.loadAsync(archive);
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string')) as Record<string, unknown>;

    expect(Object.keys(manifest)).toEqual(['1_1']);
    expect(zip.file('Images/1_1.png')).not.toBeNull();
  });

  it('rejects archives above the D200H firmware limit', () => {
    expect(() => assertArchiveSize(Buffer.alloc(MAX_ARCHIVE_SIZE))).not.toThrow();
    expect(() => assertArchiveSize(Buffer.alloc(MAX_ARCHIVE_SIZE + 1))).toThrow(/196000/);
  });
});
