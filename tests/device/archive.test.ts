import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { buildButtonArchive, buildPartialButtonArchive } from '../../src/device/archive';
import type { RenderedSlot } from '../../src/domain/profile/types';

const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

const slot = (id: RenderedSlot['id'], label: string): RenderedSlot => ({
  id,
  visual: 'inactive',
  label,
  png: onePixelPng,
});

describe('D200H button archives', () => {
  it('creates the manifest and required archive entries', async () => {
    const archive = await buildButtonArchive([slot('0_0', 'Start stream')]);
    const zip = await JSZip.loadAsync(archive);
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string')) as Record<string, unknown>;

    expect(Object.keys(zip.files)).toEqual(expect.arrayContaining([
      'manifest.json',
      'dummy.txt',
      'icons/0_0.png',
      'sentinel.txt',
    ]));
    expect(manifest['0_0']).toEqual({ Icon: 'icons/0_0.png' });
  });

  it('creates a partial archive with only requested slots', async () => {
    const archive = await buildPartialButtonArchive([
      slot('0_0', 'Start stream'),
      slot('1_1', 'Mute mic'),
    ]);
    const zip = await JSZip.loadAsync(archive);

    expect(zip.file('icons/0_0.png')).not.toBeNull();
    expect(zip.file('icons/1_1.png')).not.toBeNull();
    expect(zip.file('icons/2_2.png')).toBeNull();
  });
});
