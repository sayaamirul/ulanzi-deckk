import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Ulanzi DecKK branding', () => {
  it('uses the branded package and product identity', () => {
    const packageJson = JSON.parse(read('package.json')) as { name?: string; description?: string };
    const lockfile = JSON.parse(read('package-lock.json')) as { name?: string; packages?: { '': { name?: string } } };
    const builderConfig = read('electron-builder.yml');

    expect(packageJson.name).toBe('ulanzi-deckk');
    expect(packageJson.description).toContain('Ulanzi DecKK');
    expect(lockfile.name).toBe('ulanzi-deckk');
    expect(lockfile.packages?.[''].name).toBe('ulanzi-deckk');
    expect(builderConfig).toContain('appId: com.ulanzi.deckk');
    expect(builderConfig).toContain('productName: Ulanzi DecKK');
  });

  it('uses the branded name in the app shell and tray', () => {
    expect(read('src/renderer/index.html')).toContain('<title>Ulanzi DecKK</title>');
    expect(read('src/renderer/components/ProfileToolbar.tsx')).toContain('Ulanzi DecKK');
    expect(read('src/main/tray.ts')).toContain("tray.setToolTip('Ulanzi DecKK')");
  });
});
