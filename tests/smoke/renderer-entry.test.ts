import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('renderer entry', () => {
  it('references the renderer entry relative to index.html', () => {
    const html = readFileSync(resolve(process.cwd(), 'src/renderer/index.html'), 'utf8');

    expect(html).toContain('src="./main.tsx"');
    expect(html).not.toContain('src="/src/renderer/main.tsx"');
  });
});
