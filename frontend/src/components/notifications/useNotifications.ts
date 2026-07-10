import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  deleteNotification,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notificationService';
import { extractApiErrorMessage } from '../../services/authService';
import { emitLocalEvent } from '../../services/realtimeEventBus';
import { queryKeys } from '../../lib/queryKeys';

interface UseNotificationsOptions {
  unreadOnly?: boolean;
  pageSize?: number;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { unreadOnly = false, pageSize = 20 } = options;
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ['notifications', { unreadOnly, pageSize }],
    queryFn: ({ pageParam }) =>
      listMyNotifications({ page: pageParam, size: pageSize, sort: 'createdAt,desc' }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
  });

  const items = (query.data?.pages.flatMap((p) => p.items) ?? []).filter((n) => !unreadOnly || !n.read);
  const hasUnread = (query.data?.pages.flatMap((p) => p.items) ?? []).some((n) => !n.read);

  function afterChange(): void {
    emitLocalEvent('NOTIFICATIONS_CHANGED');
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.unreadNotifications });
  }

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: afterChange,
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: afterChange,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: afterChange,
  });

  return {
    items,
    hasUnread,
    loading: query.isLoading,
    error: query.error ? extractApiErrorMessage(query.error, 'Failed to load notifications') : '',
    isFetching: query.isFetching,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    markRead: (id: string) => markReadMutation.mutate(id),
    markAllRead: () => markAllMutation.mutate(),
    deleteNotification: (id: string) => deleteMutation.mutate(id),
    markReadPending: markReadMutation.isPending,
    markAllPending: markAllMutation.isPending,
    deletePending: deleteMutation.isPending,
  };
}
