// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProfileDialog } from '../../src/renderer/components/ProfileDialog';

const renderDialog = (props: Partial<React.ComponentProps<typeof ProfileDialog>> = {}) => {
  const returnFocusRef = { current: document.createElement('button') };
  document.body.append(returnFocusRef.current);
  return render(
    <ProfileDialog
      mode="create"
      returnFocusRef={returnFocusRef}
      onClose={vi.fn()}
      onSubmit={vi.fn()}
      {...props}
    />,
  );
};

describe('ProfileDialog', () => {
  afterEach(() => cleanup());
  it('requires a trimmed name before submitting', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderDialog({ onSubmit });

    expect(screen.getByRole('heading', { name: 'Create Profile' })).toBeInTheDocument();
    const input = screen.getByRole('textbox', { name: 'Profile name' });
    await user.type(input, '   ');
    expect(screen.getByRole('button', { name: 'Create profile' })).toBeDisabled();
    await user.clear(input);
    await user.type(input, ' Studio ');
    await user.click(screen.getByRole('button', { name: 'Create profile' }));

    expect(onSubmit).toHaveBeenCalledWith('Studio');
  });

  it('uses duplicate copy and restores focus when dismissed with Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const returnFocusRef = { current: document.createElement('button') };
    document.body.append(returnFocusRef.current);
    returnFocusRef.current.focus();
    renderDialog({ mode: 'duplicate', initialName: 'Stream Control', returnFocusRef, onClose });

    expect(screen.getByRole('heading', { name: 'Duplicate Profile' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Profile name' })).toHaveValue('Stream Control');
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(returnFocusRef.current).toHaveFocus();
  });

  it('closes on outside click and shows an inline error', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDialog({ onClose, error: 'A profile with that name already exists.' });

    expect(screen.getByRole('alert')).toHaveTextContent(/already exists/i);
    await user.click(screen.getByRole('presentation'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
