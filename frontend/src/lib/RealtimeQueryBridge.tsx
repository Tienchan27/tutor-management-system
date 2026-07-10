import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { realtimeEventBus } from '../services/realtimeEventBus';
import { invalidateForRealtimeEvent, REALTIME_DATA_EVENTS } from './queryKeys';

function RealtimeQueryBridge(): null {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubs = REALTIME_DATA_EVENTS.map((type) =>
      realtimeEventBus.subscribe(type, () => {
        window.setTimeout(() => invalidateForRealtimeEvent(queryClient, type), 250);
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [queryClient]);

  return null;
}

export default RealtimeQueryBridge;
