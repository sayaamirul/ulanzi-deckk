// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { useState } from 'react';
import type { Action } from '../../src/domain/actions/types';
import { ActionEditor } from '../../src/renderer/components/ActionEditor';

describe('action editor', () => {
  afterEach(() => cleanup());

  it('shows the scene name field for an OBS scene action', async () => {
    const user = userEvent.setup();
    const Harness = () => {
      const [action, setAction] = useState<Action>({ type: 'obs.stream.toggle' });
      return <ActionEditor action={action} onChange={setAction} />;
    };
    render(<Harness />);

    const actionType = screen.getByRole('combobox', { name: 'Action type' });
    await user.click(actionType);
    await user.type(actionType, 'scene');
    await user.click(screen.getByRole('option', { name: 'Switch scene' }));

    expect(screen.getByLabelText('Scene name')).toBeInTheDocument();
  });

  it('shows OBS scenes as a searchable select when they are available', async () => {
    const user = userEvent.setup();
    render(<ActionEditor action={{ type: 'obs.scene.set', sceneName: 'Live' }} sceneNames={['Starting Soon', 'Live']} onChange={() => undefined} />);

    const sceneSelect = screen.getByRole('combobox', { name: 'Scene name' });
    expect(sceneSelect).toHaveValue('Live');
    await user.click(sceneSelect);

    expect(screen.getByRole('option', { name: 'Starting Soon' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Live' })).toBeInTheDocument();
  });

  it('shows a scene-list loading error instead of silently hiding the problem', () => {
    render(<ActionEditor action={{ type: 'obs.scene.set', sceneName: '' }} sceneNamesError="Could not load scenes from OBS" onChange={() => undefined} />);

    expect(screen.getByRole('alert')).toHaveTextContent(/could not load scenes from obs/i);
  });

  it('filters the action select by the selected action group', async () => {
    const user = userEvent.setup();
    const Harness = () => {
      const [action, setAction] = useState<Action>({ type: 'obs.stream.toggle' });
      return <ActionEditor action={action} folders={[{ id: 'apps', name: 'Apps', kind: 'folder', parentPageId: 'main', slots: {} }]} onChange={setAction} />;
    };
    render(<Harness />);

    expect(screen.getByRole('combobox', { name: 'Action group' })).toHaveValue('OBS');
    expect(screen.getByRole('combobox', { name: 'Action type' })).toHaveValue('Toggle stream');

    const actionGroup = screen.getByRole('combobox', { name: 'Action group' });
    await user.click(actionGroup);
    expect(screen.getByRole('option', { name: 'System' })).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'System' }));

    expect(screen.getByRole('combobox', { name: 'Action group' })).toHaveValue('System');
    expect(screen.getByRole('combobox', { name: 'Action type' })).toHaveValue('Launch app');
    expect(screen.getByLabelText('Executable')).toBeInTheDocument();

    const actionType = screen.getByRole('combobox', { name: 'Action type' });
    await user.click(actionType);
    expect(screen.getByRole('option', { name: 'Launch app' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Toggle stream' })).not.toBeInTheDocument();
  });
});
