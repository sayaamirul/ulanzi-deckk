import { describe, expect, it } from 'vitest';
import config from '../../electron.vite.config';

describe('electron vite config', () => {
  it('externalizes main-process runtime dependencies', () => {
    const mainConfig = config.main;
    expect(mainConfig).toBeDefined();
    expect(mainConfig).not.toBeTypeOf('function');
    expect(mainConfig).not.toBeInstanceOf(Promise);
    if (!mainConfig || typeof mainConfig === 'function' || mainConfig instanceof Promise) return;

    const plugins = Array.isArray(mainConfig.plugins)
      ? mainConfig.plugins
      : [mainConfig.plugins].filter(Boolean);

    expect(plugins).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'vite:externalize-deps' }),
      ]),
    );
  });
});
