import type { ThemePreference } from '../main/preferences';

export type ResolvedTheme = 'light' | 'dark';

export const normalizeThemePreference = (input: unknown): ThemePreference => (
  input === 'light' || input === 'dark' || input === 'system' ? input : 'system'
);

export const resolveTheme = (preference: ThemePreference, prefersDark: boolean): ResolvedTheme => {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  return prefersDark ? 'dark' : 'light';
};

export const applyTheme = (
  root: { dataset: DOMStringMap },
  preference: ThemePreference,
  prefersDark: boolean,
): ResolvedTheme => {
  const resolvedTheme = resolveTheme(preference, prefersDark);
  root.dataset.theme = resolvedTheme;
  return resolvedTheme;
};

export const subscribeToSystemTheme = (
  preference: ThemePreference,
  listener: (prefersDark: boolean) => void,
): (() => void) => {
  if (preference !== 'system') return () => undefined;

  if (typeof window.matchMedia !== 'function') {
    listener(true);
    return () => undefined;
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = (event: MediaQueryListEvent) => listener(event.matches);
  listener(mediaQuery.matches);

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }

  const legacyMediaQuery = mediaQuery as MediaQueryList & {
    addListener: (listener: (event: MediaQueryListEvent) => void) => void;
    removeListener: (listener: (event: MediaQueryListEvent) => void) => void;
  };
  legacyMediaQuery.addListener(handleChange);
  return () => legacyMediaQuery.removeListener(handleChange);
};

export type { ThemePreference };
