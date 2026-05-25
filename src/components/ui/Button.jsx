import { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { Spinner } from './Spinner';

const VARIANTS = {
  // Primary action — used sparingly, one per page ideally.
  primary:
    'bg-brand-900 text-white hover:bg-brand-800 active:bg-brand-950 disabled:bg-brand-900/40',
  // Secondary — neutral, the workhorse.
  secondary:
    'bg-white text-ink border border-line hover:bg-stone-50 active:bg-stone-100 disabled:bg-white/60 disabled:text-ink/40',
  // Ghost — for low-emphasis controls inside busy areas.
  ghost:
    'bg-transparent text-ink hover:bg-stone-100 active:bg-stone-200 disabled:text-ink/40',
  // Destructive — guard rail for irreversible actions.
  danger:
    'bg-red-700 text-white hover:bg-red-800 active:bg-red-900 disabled:bg-red-700/40',
};

const SIZES = {
  sm: 'h-8  px-3   text-xs',
  md: 'h-10 px-4   text-sm',
  lg: 'h-12 px-5   text-base',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className, loading, leftIcon, rightIcon, children, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
        'transition-colors duration-150',
        'disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? <Spinner size={16} className="text-current" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});
