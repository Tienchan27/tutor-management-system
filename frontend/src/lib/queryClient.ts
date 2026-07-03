import { QueryClient } from '@tanstack/react-query';

// Single shared client. Server state is refreshed reactively via the realtime
// invalidation bridge, so aggressive refetch-on-focus is unnecessary.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 10_000,
    },
  },
});
