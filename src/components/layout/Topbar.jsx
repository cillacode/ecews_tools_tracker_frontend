// Mobile-only topbar with brand mark and a small user chip.
// Desktop users get the full sidebar instead.

import { useAuth } from '../../auth/useAuth';
import { Brand } from './Brand';

export function Topbar() {
  const { user } = useAuth();

  return (
    <header className="flex h-14 items-center justify-between border-b border-line bg-white px-4 md:hidden">
      <Brand variant="mark" />
      <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-900 text-sm font-semibold text-white">
        {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
      </div>
    </header>
  );
}
