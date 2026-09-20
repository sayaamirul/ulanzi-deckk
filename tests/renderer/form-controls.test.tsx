// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FormButton } from '../../src/renderer/components/ui/FormButton';
import { FormInput } from '../../src/renderer/components/ui/FormInput';
import { FormSelect } from '../../src/renderer/components/ui/FormSelect';

describe('form controls', () => {
  it('applies shared size and color props while forwarding native props and styles', () => {
    const inputRef = createRef<HTMLInputElement>();
    const selectRef = createRef<HTMLSelectElement>();
    const buttonRef = createRef<HTMLButtonElement>();

    render(
      <>
        <FormInput ref={inputRef} size="lg" color="accent" className="custom-input" style={{ maxWidth: 240 }} aria-label="Title" />
        <FormSelect ref={selectRef} size="sm" color="danger" aria-label="Mode" defaultValue="one">
          <option value="one">One</option>
        </FormSelect>
        <FormButton ref={buttonRef} size="md" color="success" variant="outline" style={{ minWidth: 120 }}>Apply</FormButton>
      </>,
    );

    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveClass('ui-input', 'ui-control--lg', 'ui-control--accent', 'custom-input');
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveStyle({ maxWidth: '240px' });
    expect(screen.getByRole('combobox', { name: 'Mode' })).toHaveClass('ui-select', 'ui-control--sm', 'ui-control--danger');
    expect(screen.getByRole('button', { name: 'Apply' })).toHaveClass('ui-button', 'ui-button--outline', 'ui-control--md', 'ui-control--success');
    expect(screen.getByRole('button', { name: 'Apply' })).toHaveStyle({ minWidth: '120px' });
    expect(inputRef.current).toBe(screen.getByRole('textbox', { name: 'Title' }));
    expect(selectRef.current).toBe(screen.getByRole('combobox', { name: 'Mode' }));
    expect(buttonRef.current).toBe(screen.getByRole('button', { name: 'Apply' }));
  });

  it('filters searchable select options and emits the selected native value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FormSelect searchable className="profile-select" style={{ maxWidth: 220 }} aria-label="Profile" value="one" onChange={onChange}>
        <option value="one">Stream Control</option>
        <option value="two">Studio</option>
      </FormSelect>,
    );

    const search = screen.getByRole('combobox', { name: 'Profile' });
    expect(search.closest('.ui-select-search-field')).toHaveAttribute('data-open', 'false');
    expect(search).toHaveClass('profile-select');
    expect(search).toHaveStyle({ maxWidth: '220px' });
    await user.click(search);
    expect(search.closest('.ui-select-search-field')).toHaveAttribute('data-open', 'true');
    await user.type(search, 'stu');

    expect(screen.getByRole('option', { name: 'Studio' })).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Studio' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ target: expect.objectContaining({ value: 'two' }) }));
  });

  it('keeps radio and checkbox inputs compact when using the shared input', () => {
    render(<FormInput type="radio" aria-label="Light" />);

    expect(screen.getByRole('radio', { name: 'Light' })).toHaveClass('ui-input', 'ui-input--choice');
  });
});
