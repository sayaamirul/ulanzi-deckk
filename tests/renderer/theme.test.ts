// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyTheme,
  normalizeThemePreference,
  resolveTheme,
  subscribeToSystemTheme,
} from '../../src/renderer/theme';

type MediaListener = (event: MediaQueryListEvent) => void;

const createMediaQueryList = (matches: boolean) => {
  let currentMatches = matches;
  const listeners = new Set<MediaListener>();
  const media = {
    get matches() {
      return currentMatches;
    },
    media: '(prefers-color-scheme: dark)',
    addEventListener: vi.fn((_type: string, listener: MediaListener) => listeners.add(listener)),
    removeEventListener: vi.fn((_type: string, listener: MediaListener) => listeners.delete(listener)),
    dispatch(nextMatches: boolean) {
      currentMatches = nextMatches;
      listeners.forEach((listener) => listener({ matches: nextMatches } as MediaQueryListEvent));
    },
  } as unknown as MediaQueryList & { dispatch: (nextMatches: boolean) => void };
  return media;
};

describe('theme controller', () => {
  let media: MediaQueryList & { dispatch: (nextMatches: boolean) => void };

  beforeEach(() => {
    media = createMediaQueryList(true);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => media),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes unsupported preferences to system', () => {
    expect(normalizeThemePreference('light')).toBe('light');
    expect(normalizeThemePreference('dark')).toBe('dark');
    expect(normalizeThemePreference('system')).toBe('system');
    expect(normalizeThemePreference('unknown')).toBe('system');
  });

  it('resolves explicit modes and Auto from the system preference', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('applies the resolved mode to the document root', () => {
    expect(applyTheme(document.documentElement, 'system', true)).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');

    expect(applyTheme(document.documentElement, 'light', true)).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('does not subscribe to system changes for explicit modes', () => {
    const unsubscribe = subscribeToSystemTheme('dark', vi.fn());

    expect(window.matchMedia).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('notifies immediately and removes the system listener on cleanup', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToSystemTheme('system', listener);

    expect(listener).toHaveBeenCalledWith(true);
    expect(media.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    media.dispatch(false);
    expect(listener).toHaveBeenLastCalledWith(false);

    unsubscribe();
    expect(media.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('keeps the safe dark fallback when matchMedia is unavailable', () => {
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: undefined });
    const listener = vi.fn();

    expect(() => subscribeToSystemTheme('system', listener)).not.toThrow();
    expect(listener).toHaveBeenCalledWith(true);
  });
});
