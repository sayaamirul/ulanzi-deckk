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
    expect(styles).toContain('.workspace-shell::before');
    expect(styles).toContain('.workspace-shell::after');
    expect(styles).toContain('height: 100vh;');
    expect(styles).toContain('min-height: 0;');
    expect(styles).toContain('overflow: hidden;');
    expect(styles).toContain('.workspace-body');
    expect(styles).toContain('overflow: auto;');
    expect(styles).toContain('.profile-toolbar-fields > input');
    expect(styles).not.toContain('.profile-toolbar input');
    expect(styles).toContain('.ui-input.ui-input--choice');
    expect(styles).not.toContain('#7ee787');

    const toolbarStyles = styles.match(/\.profile-toolbar \{[^}]*\}/)?.[0] ?? '';
    expect(toolbarStyles).not.toContain('border-bottom');
    expect(styles).toContain('.device-slot.is-selected');
    expect(styles).toContain('padding: 20px 24px 32px;');
    expect(styles).toContain('border-radius: 0;');
    expect(styles).not.toContain('border-radius: 20px');
    expect(styles).not.toContain('border-radius: 16px');
    expect(styles).not.toContain('border-radius: 14px');
    expect(styles).not.toContain('border-radius: 12px');
    expect(styles).not.toContain('border-radius: 10px');
    expect(styles).not.toContain('border-radius: 8px');
    expect(styles).not.toContain('border-radius: 999px');

    const sidebarStyles = styles.match(/\.workspace-sidebar \{[^}]*\}/)?.[0] ?? '';
    expect(sidebarStyles).toContain('gap: 12px;');
    expect(sidebarStyles).toContain('align-content: start;');
  });
});
