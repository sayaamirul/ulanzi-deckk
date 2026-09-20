import { Children, forwardRef, isValidElement, useEffect, useId, useRef, useState, type ChangeEvent, type ReactNode, type SelectHTMLAttributes } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { controlClassName, type SharedControlProps } from './formTypes';

export type FormSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'color' | 'size'> & SharedControlProps & {
  searchable?: boolean;
};

type OptionData = { value: string; label: string; disabled: boolean };

const getOptions = (children: ReactNode): OptionData[] => Children.toArray(children).flatMap((child) => {
  if (!isValidElement<{ value?: string; children?: ReactNode; disabled?: boolean }>(child) || child.type !== 'option') return [];
  return [{
    value: String(child.props.value ?? child.props.children ?? ''),
    label: String(child.props.children ?? child.props.value ?? ''),
    disabled: Boolean(child.props.disabled),
  }];
});

const SearchableSelect = forwardRef<HTMLSelectElement, FormSelectProps>(function SearchableSelect({ size, color, className, style, children, value, defaultValue, onChange, searchable: _searchable, ...props }, ref) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listboxId = `ui-select-options-${useId().replace(/:/g, '')}`;
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const options = getOptions(children);
  const selectedValue = typeof value === 'string' ? value : typeof defaultValue === 'string' ? defaultValue : '';
  const selectedOption = options.find((option) => option.value === selectedValue);
  const visibleOptions = query.trim()
    ? options.filter((option) => `${option.label} ${option.value}`.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [isOpen]);

  const selectOption = (nextValue: string) => {
    const event = { target: { value: nextValue } } as unknown as ChangeEvent<HTMLSelectElement>;
    onChange?.(event);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={wrapperRef} className="ui-select-searchable">
      <div className="ui-select-search-field" data-open={isOpen}>
        <input
          id={props.id}
          name={props.name}
          disabled={props.disabled}
          required={props.required}
          autoComplete={props.autoComplete}
          aria-label={props['aria-label']}
          aria-labelledby={props['aria-labelledby']}
          aria-describedby={props['aria-describedby']}
          aria-haspopup="listbox"
          className={controlClassName('ui-input ui-select-search', size ?? 'md', color ?? 'default', className)}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          value={isOpen ? query : selectedOption?.label ?? ''}
          onFocus={() => { setIsOpen(true); setQuery(''); }}
          onChange={(event) => { setQuery(event.target.value); setIsOpen(true); }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setIsOpen(false);
              setQuery('');
            } else if (event.key === 'Enter' && visibleOptions.length === 1 && !visibleOptions[0]?.disabled) {
              event.preventDefault();
              selectOption(visibleOptions[0]!.value);
            }
          }}
          style={style}
        />
        {isOpen ? <Search className="ui-select-search-icon" size={14} aria-hidden="true" /> : <ChevronDown className="ui-select-chevron" size={15} aria-hidden="true" />}
      </div>
      <select {...props} ref={ref} className={controlClassName('ui-select ui-select-searchable-native', size ?? 'md', color ?? 'default')} value={selectedValue} onChange={onChange} tabIndex={-1} aria-hidden="true" style={{ ...style, display: 'none' }}>
        {children}
      </select>
      {isOpen && (
        <div id={listboxId} className="ui-select-menu" role="listbox">
          {visibleOptions.length === 0
            ? <div className="ui-select-empty" role="status">No matches</div>
            : visibleOptions.map((option) => (
              <button
                className={option.value === selectedValue ? 'is-selected' : ''}
                disabled={option.disabled}
                key={option.value}
                role="option"
                type="button"
                aria-selected={option.value === selectedValue}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option.value)}
              >
                {option.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
});

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(function FormSelect({ searchable = false, size = 'md', color = 'default', className, style, ...props }, ref) {
  if (searchable) return <SearchableSelect ref={ref} searchable size={size} color={color} className={className} style={style} {...props} />;
  return <select {...props} ref={ref} className={controlClassName('ui-select', size, color, className)} style={style} />;
});

/** @deprecated Use FormSelect for new code. */
export const AppSelect = FormSelect;
export type AppSelectProps = FormSelectProps;
