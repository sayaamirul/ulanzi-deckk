import { forwardRef, type InputHTMLAttributes } from 'react';
import { controlClassName, type SharedControlProps } from './formTypes';

export type FormInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'color' | 'size'> & SharedControlProps;

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(function FormInput({ size = 'md', color = 'default', className, style, type = 'text', ...props }, ref) {
  const isChoiceInput = type === 'radio' || type === 'checkbox';
  return <input {...props} type={type} ref={ref} className={controlClassName(`ui-input${isChoiceInput ? ' ui-input--choice' : ''}`, size, color, className)} style={style} />;
});

/** @deprecated Use FormInput for new code. */
export const AppInput = FormInput;
export type AppInputProps = FormInputProps;
