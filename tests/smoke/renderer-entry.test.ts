import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('renderer entry', () => {
  it('references the renderer entry relative to index.html', () => {
    const html = readFileSync(resolve(process.cwd(), 'src/renderer/index.html'), 'utf8');

    expect(html).toContain('src="./main.tsx"');
    expect(html).not.toContain('src="/src/renderer/main.tsx"');
  });

  it('loads the ESM preload bridge with the required Electron settings', () => {
    const main = readFileSync(resolve(process.cwd(), 'src/main/index.ts'), 'utf8');

    expect(main).toContain("preload: join(__dirname, '../preload/index.mjs')");
    expect(main).toContain('sandbox: false');
  });
});
