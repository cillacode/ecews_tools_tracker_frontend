import { cn } from '../../lib/utils';

const TONES = {
  neutral: 'border-line bg-stone-50 text-ink',
  brand:   'border-brand-200 bg-brand-50 text-brand-900',
  amber:   'border-amber-200 bg-amber-50 text-accent-700',
  red:     'border-red-200 bg-red-50 text-red-700',
};

export function Badge({ tone = 'neutral', className, children }) {
  return <span className={cn('pill', TONES[tone], className)}>{children}</span>;
}
