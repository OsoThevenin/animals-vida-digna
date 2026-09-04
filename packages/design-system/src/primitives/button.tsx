import type { ReactNode } from 'react';

export type ButtonVariant = 'accent' | 'primary' | 'outline';

export interface ButtonProps {
  children: ReactNode;
  /** Accent is the site's main CTA; outline sits on dark backgrounds. */
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  /** Renders an anchor instead of a button. */
  href?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  fullWidth?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  accent: 'bg-accent text-text transition-colors hover:bg-accent-light',
  primary:
    'bg-primary text-surface transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60',
  outline:
    'border-2 border-surface/30 bg-transparent text-surface transition-colors hover:border-surface hover:bg-surface/10',
};

const SIZES = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3',
  lg: 'px-8 py-3',
};

export function Button({
  children,
  variant = 'accent',
  size = 'md',
  href,
  type = 'button',
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  const className = [
    'inline-block rounded-lg font-semibold',
    VARIANTS[variant],
    SIZES[size],
    fullWidth ? 'w-full text-center' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (href) {
    const isExternal = href.startsWith('http');
    return (
      <a
        className={className}
        href={href}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        target={isExternal ? '_blank' : undefined}
      >
        {children}
      </a>
    );
  }

  return (
    <button className={className} disabled={disabled} type={type}>
      {children}
    </button>
  );
}
