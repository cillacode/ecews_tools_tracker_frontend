import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export const Select = forwardRef(function Select(
  { className, error, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        'h-10 w-full rounded-lg border bg-white px-3 text-sm text-ink',
        'transition-colors duration-150',
        'focus:outline-none',
        error
          ? 'border-red-500 focus:border-red-500'
          : 'border-line hover:border-stone-300 focus:border-brand-700',
        'disabled:bg-stone-50 disabled:text-muted disabled:cursor-not-allowed',
        className
      )}
      aria-invalid={Boolean(error)}
      {...props}
    >
      {children}
    </select>
  );
});
