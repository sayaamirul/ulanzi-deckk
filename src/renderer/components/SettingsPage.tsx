import { useEffect, useRef } from 'react';
import type { ThemePreference } from '../theme';
import { FormButton } from './ui/FormButton';
import { FormInput } from './ui/FormInput';

type Props = {
  theme: ThemePreference;
  saveError?: string;
  onThemeChange: (theme: ThemePreference) => void;
  onBack: () => void;
};

const themeOptions: Array<{ value: ThemePreference; label: string; description: string }> = [
  { value: 'light', label: 'Light', description: 'Use a bright workspace with dark text.' },
  { value: 'dark', label: 'Dark', description: 'Use the low-light workspace palette.' },
  { value: 'system', label: 'Auto', description: 'Follow your operating system appearance.' },
];

export const SettingsPage = ({ theme, saveError, onThemeChange, onBack }: Props) => {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <main className="settings-shell">
      <header className="settings-heading">
        <div>
          <p className="eyebrow">APP SETTINGS</p>
          <h1 ref={headingRef} tabIndex={-1}>Settings</h1>
          <p className="muted">Tune the app’s appearance. These preferences apply across every profile.</p>
        </div>
        <FormButton type="button" onClick={onBack}>Back to workspace</FormButton>
      </header>

      <section className="settings-card" aria-labelledby="appearance-heading">
        <div className="settings-card-heading">
          <div>
            <p className="eyebrow">APPEARANCE</p>
            <h2 id="appearance-heading">Theme</h2>
            <p className="muted">Choose how Ulanzi should look on this computer.</p>
          </div>
        </div>

        <fieldset className="theme-options">
          <legend className="sr-only">Theme</legend>
          {themeOptions.map((option) => (
            <label className={`theme-option${theme === option.value ? ' is-selected' : ''}`} key={option.value}>
              <FormInput
                type="radio"
                name="theme"
                value={option.value}
                aria-label={option.label}
                aria-describedby={`${option.value}-theme-description`}
                checked={theme === option.value}
                onChange={() => onThemeChange(option.value)}
              />
              <span className="theme-option-copy">
                <strong>{option.label}</strong>
                <span id={`${option.value}-theme-description`} className="theme-option-description">{option.description}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {saveError && (
          <div className="settings-error" role="alert">
            <span>{saveError}</span>
            <FormButton type="button" onClick={() => onThemeChange(theme)}>Retry</FormButton>
          </div>
        )}
      </section>
    </main>
  );
};
