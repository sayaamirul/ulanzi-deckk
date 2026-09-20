import type { CSSProperties } from 'react';

export type ControlSize = 'sm' | 'md' | 'lg';
export type ControlColor = 'default' | 'accent' | 'danger' | 'success';
export type ButtonVariant = 'default' | 'solid' | 'outline' | 'ghost' | 'icon';

export type SharedControlProps = {
  size?: ControlSize;
  color?: ControlColor;
  className?: string;
  style?: CSSProperties;
};

export const controlClassName = (base: string, size: ControlSize, color: ControlColor, className?: string) => [
  base,
  `ui-control--${size}`,
  `ui-control--${color}`,
  className,
].filter(Boolean).join(' ');
