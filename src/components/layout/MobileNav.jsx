// Bottom tab bar for mobile. Only includes items flagged mobile:true in
// navItems.js — secondary screens (Movements, Users) live in a "More" overflow
// later, but the scaffold doesn't need that yet.
//
// The "Receive" item gets emphasized — it's the most common daily action, so
// it sits centre with a raised brand-coloured pill instead of an icon outline.

import { NavLink } from 'react-router-dom';
import { visibleNavItems } from './navItems';
import { useAuth } from '../../auth/useAuth';
import { useNotifications, badgeForRoute } from '../../hooks/useNotifications';
import { cn } from '../../lib/utils';

export function MobileNav() {
  const { user } = useAuth();
  const items = visibleNavItems(user?.role, { mobile: true });
  const counts = useNotifications();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t border-line bg-white md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isPrimary = item.primary;
        const badge = badgeForRoute(item.to, counts);

        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                isPrimary
                  ? '' // primary item gets its own treatment below
                  : isActive
                    ? 'text-brand-900'
                    : 'text-muted hover:text-ink'
              )
            }
          >
            {({ isActive }) =>
              isPrimary ? (
                <>
                  <span
                    className={cn(
                      'grid h-10 w-10 place-items-center rounded-full',
                      'bg-brand-900 text-white shadow-card',
                      isActive && 'ring-2 ring-brand-700 ring-offset-2 ring-offset-white'
                    )}
                  >
                    <Icon size={18} />
                  </span>
                  <span className={cn(isActive ? 'text-brand-900' : 'text-muted')}>{item.label}</span>
                </>
              ) : (
                <>
                  <span className="relative">
                    <Icon size={20} />
                    {badge > 0 && (
                      <span className="absolute -right-2 -top-1.5 grid min-w-[1rem] justify-items-center rounded-full bg-red-600 px-1 text-[9px] font-bold leading-tight text-white">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </span>
                  <span>{item.label}</span>
                </>
              )
            }
          </NavLink>
        );
      })}
    </nav>
  );
}
