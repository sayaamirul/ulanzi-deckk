import { forwardRef, type InputHTMLAttributes } from 'react';
import { controlClassName, type SharedControlProps } from './formTypes';

export type FormInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'color' | 'size'> & SharedControlProps;

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(function FormInput({ size = 'md', color = 'default', className, style, ...props }, ref) {
  return <input {...props} ref={ref} className={controlClassName('ui-input', size, color, className)} style={style} />;
});

/** @deprecated Use FormInput for new code. */
export const AppInput = FormInput;
export type AppInputProps = FormInputProps;
