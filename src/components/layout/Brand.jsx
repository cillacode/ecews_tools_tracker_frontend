// The brand mark. Two variants:
//  - 'mark' = just the icon
//  - 'wordmark' = icon + name (the serif gives it warmth/personality)
//
// Used in sidebar, login page, mobile topbar.

import { cn } from '../../lib/utils';

export function Brand({ variant = 'wordmark', className }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-900 text-white shadow-soft">
        <svg viewBox="0 0 32 32" width="20" height="20" aria-hidden="true">
          <path
            d="M9 22V10l4 7 3-5 3 5 4-7v12"
            stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none"
          />
        </svg>
      </span>
      {variant === 'wordmark' && (
        <span className="leading-none">
          <span className="block font-serif text-lg italic text-ink">MER Tools</span>
          <span className="block text-[10px] uppercase tracking-[0.18em] text-muted">Distribution</span>
        </span>
      )}
    </span>
  );
}
