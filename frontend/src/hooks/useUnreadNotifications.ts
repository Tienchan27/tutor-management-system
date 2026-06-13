import { useCallback, useEffect, useState } from 'react';
import { listMyNotifications } from '../services/notificationService';
import { realtimeEventBus } from '../services/realtimeEventBus';

const POLL_INTERVAL_MS = 60_000;

export function useUnreadNotifications(): number {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = useCallback(async (): Promise<void> => {
    try {
      const response = await listMyNotifications({ page: 0, size: 20 });
      const count = response.items.filter((n) => !n.read).length;
      setUnreadCount(count);
    } catch {
      // Silent failure — badge absence is acceptable if the request fails.
    }
  }, []);

  useEffect(() => {
    void fetchCount();

    const unsubscribe = realtimeEventBus.subscribe('NOTIFICATION_CREATED', () => {
      void fetchCount();
    });

    const intervalId = window.setInterval(() => {
      void fetchCount();
    }, POLL_INTERVAL_MS);

    return () => {
      unsubscribe();
      window.clearInterval(intervalId);
    };
  }, [fetchCount]);

  return unreadCount;
}
