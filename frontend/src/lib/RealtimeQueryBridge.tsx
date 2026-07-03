import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { realtimeEventBus } from '../services/realtimeEventBus';

// Realtime events that mean "server data changed". On any of them we invalidate
// active queries so mounted pages refetch — this replaces the per-page
// realtimeEventBus subscriptions that used to call loadData() by hand.
const DATA_EVENTS = [
  'DASHBOARD_INVALIDATE',
  'PAYOUT_UPDATED',
  'SESSION_FINANCIAL_UPDATED',
  'MARKETPLACE_UPDATED',
  'NOTIFICATION_CREATED',
  'NOTIFICATIONS_CHANGED',
] as const;

function RealtimeQueryBridge(): null {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubs = DATA_EVENTS.map((type) =>
      realtimeEventBus.subscribe(type, () => {
        window.setTimeout(() => void queryClient.invalidateQueries(), 250);
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [queryClient]);

  return null;
}

export default RealtimeQueryBridge;
