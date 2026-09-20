import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const stylesPath = fileURLToPath(new URL('../../src/renderer/styles.css', import.meta.url));

describe('renderer theme styles', () => {
  it('defines both palettes, purple accent tokens, and Settings styles', () => {
    const styles = readFileSync(stylesPath, 'utf8');

    expect(styles).toContain('[data-theme="light"]');
    expect(styles).toContain('[data-theme="dark"]');
    expect(styles).toContain('--color-accent:');
    expect(styles).toContain('--color-accent-hover:');
    expect(styles).toContain('--color-accent-contrast:');
    expect(styles).toContain('.settings-shell');
    expect(styles).toContain('.theme-option');
    expect(styles).toContain('.workspace-shell {');
    expect(styles).toContain('height: 100vh;');
    expect(styles).toContain('min-height: 0;');
    expect(styles).toContain('overflow: hidden;');
    expect(styles).toContain('.workspace-body');
    expect(styles).toContain('overflow: auto;');
    expect(styles).not.toContain('#7ee787');
  });
});
