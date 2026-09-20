// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import type { Action } from '../../src/domain/actions/types';
import { ActionEditor } from '../../src/renderer/components/ActionEditor';

describe('action editor', () => {
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
});
