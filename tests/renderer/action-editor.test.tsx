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

    await user.selectOptions(screen.getByLabelText('Action type'), 'obs.scene.set');

    expect(screen.getByLabelText('Scene name')).toBeInTheDocument();
  });

  it('filters the action select by the selected action group', async () => {
    const user = userEvent.setup();
    const Harness = () => {
      const [action, setAction] = useState<Action>({ type: 'obs.stream.toggle' });
      return <ActionEditor action={action} folders={[{ id: 'apps', name: 'Apps', kind: 'folder', parentPageId: 'main', slots: {} }]} onChange={setAction} />;
    };
    render(<Harness />);

    expect(screen.getByLabelText('Action group')).toHaveValue('OBS');
    expect(screen.getByLabelText('Action type')).toHaveValue('obs.stream.toggle');
    expect(screen.getByRole('option', { name: 'Toggle stream' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Open URL/file' })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Action group'), 'System');

    expect(screen.getByLabelText('Action type')).toHaveValue('system.launch');
    expect(screen.getByLabelText('Executable')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Toggle stream' })).not.toBeInTheDocument();
  });
});
