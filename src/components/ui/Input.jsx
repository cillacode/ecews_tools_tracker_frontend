import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export const Input = forwardRef(function Input({ className, error, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-lg border bg-white px-3 text-sm',
        'placeholder:text-muted/70',
        'transition-colors duration-150',
        error ? 'border-red-500' : 'border-line hover:border-stone-300 focus:border-brand-700',
        'disabled:bg-stone-50 disabled:text-muted',
        className
      )}
      aria-invalid={Boolean(error)}
      {...props}
    />
  );
});

export function Label({ className, children, htmlFor, required }) {
  return (
    <label htmlFor={htmlFor} className={cn('mb-1.5 block text-sm font-medium text-ink', className)}>
      {children}
      {required && <span className="ml-0.5 text-red-600">*</span>}
    </label>
  );
}

export const Textarea = forwardRef(function Textarea({ className, error, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={3}
      className={cn(
        'w-full rounded-lg border bg-white px-3 py-2 text-sm',
        'placeholder:text-muted/70 resize-none',
        'transition-colors duration-150',
        error ? 'border-red-500' : 'border-line hover:border-stone-300 focus:border-brand-700',
        'disabled:bg-stone-50 disabled:text-muted',
        'focus:outline-none',
        className
      )}
      aria-invalid={Boolean(error)}
      {...props}
    />
  );
});

// Convenient grouping that handles label + input + error in one spot.
export function Field({ id, label, required, error, hint, children }) {
  return (
    <div>
      {label && <Label htmlFor={id} required={required}>{label}</Label>}
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
