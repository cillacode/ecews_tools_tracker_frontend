import { useQuery } from '@tanstack/react-query';
import { getNotificationSummary } from '../api/notifications';
import { useAuth } from '../auth/useAuth';

// Shared notification counts for the nav badges. React Query dedupes by key, so
// the Sidebar and MobileNav both read one cached result. Polls every 60s and
// on window focus; relevant mutations also invalidate ['notification-summary']
// for an instant update.
export function useNotifications() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['notification-summary'],
    queryFn:  getNotificationSummary,
    enabled:  Boolean(user),
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });
  return data?.data ?? { incoming: 0, low_tools: 0 };
}

// Which badge count (if any) a nav route shows.
export function badgeForRoute(to, counts) {
  if (to === '/hq-receipts' || to === '/incoming') return counts.incoming || 0;
  if (to === '/procurement') return counts.low_tools || 0;
  return 0;
}
