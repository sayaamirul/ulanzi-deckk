import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { controlClassName, type ButtonVariant, type SharedControlProps } from './formTypes';

export type FormButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> & SharedControlProps & {
  variant?: ButtonVariant;
};

export const FormButton = forwardRef<HTMLButtonElement, FormButtonProps>(function FormButton({ size = 'md', color = 'default', variant = 'default', className, style, ...props }, ref) {
  return <button {...props} ref={ref} className={controlClassName(`ui-button ui-button--${variant}`, size, color, className)} style={style} />;
});

/** @deprecated Use FormButton for new code. */
export const AppButton = FormButton;
export type AppButtonProps = FormButtonProps;
