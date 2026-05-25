// Class-name merger. Combines clsx (conditionals) with tailwind-merge
// (resolves conflicting Tailwind classes, e.g. "p-2 p-4" → "p-4").

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
