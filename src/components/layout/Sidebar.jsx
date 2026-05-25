// Desktop-only sidebar. Hidden below md.
// Active state: subtle inset background + thin gold accent on the left edge,
// matching the "amber for moments" rule of the design system.

import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { Brand } from './Brand';
import { visibleNavItems } from './navItems';
import { cn } from '../../lib/utils';

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:border-r md:border-line md:bg-white">
      {/* Brand */}
      <div className="px-5 py-5">
        <Brand />
      </div>

      <div className="rule" />

      {/* Nav */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-0.5">
          {visibleNavItems(user?.role).map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-brand-50 text-brand-900'
                          : 'text-ink/80 hover:bg-stone-100 hover:text-ink'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute -left-1 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent-700" aria-hidden />
                        )}
                        <Icon size={18} className={cn(isActive ? 'text-brand-700' : 'text-muted group-hover:text-ink')} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
        </ul>
      </nav>

      {/* User card pinned to the bottom */}
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-900 text-sm font-semibold text-white">
            {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{user?.full_name}</p>
            {user?.role === 'facility_user' && user?.facility_name ? (
              <p className="truncate text-xs font-medium text-brand-700" title={user.facility_name}>
                {user.facility_name}
              </p>
            ) : user?.role === 'dso' && user?.lga_name ? (
              <p className="truncate text-xs font-medium text-brand-700" title={`${user.lga_name} LGA`}>
                {user.lga_name} LGA
              </p>
            ) : (
              <p className="truncate text-xs capitalize text-muted">{user?.role?.replace('_', ' ')}</p>
            )}
          </div>
          <button
            onClick={logout}
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-stone-100 hover:text-ink"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
