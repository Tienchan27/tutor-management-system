import { useQuery } from '@tanstack/react-query';
import { listMyNotifications } from '../services/notificationService';

const POLL_INTERVAL_MS = 60_000;

export function useUnreadNotifications(): number {
  // Realtime NOTIFICATION_CREATED / NOTIFICATIONS_CHANGED events invalidate this
  // query via the global RealtimeQueryBridge; the interval is a slow safety net.
  const { data } = useQuery({
    queryKey: ['unreadNotifications'],
    queryFn: () => listMyNotifications({ page: 0, size: 20 }),
    refetchInterval: POLL_INTERVAL_MS,
    select: (response) => response.items.filter((n) => !n.read).length,
  });

  return data ?? 0;
}
