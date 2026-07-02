import { useEffect, useState } from 'react';
import {
  deleteNotification,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notificationService';
import { NotificationResponse } from '../../types/notifications';
import { extractApiErrorMessage } from '../../services/authService';
import { emitLocalEvent, realtimeEventBus } from '../../services/realtimeEventBus';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/layout/PageSection';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import StatusPill from '../../components/ui/StatusPill';
import { useToast } from '../../components/feedback/ToastProvider';
import { formatDate } from '../../utils/format';

function formatNotificationType(type: string): string {
  switch (type) {
    case 'PAYOUT_PAID':
      return 'Payout';
    case 'PAYOUT_GENERATED':
    case 'PAYOUT_UPDATED':
      return 'Payout update';
    case 'SESSION_FINANCIAL_EDIT':
      return 'Session';
    case 'CLASS_APPLICATION_APPROVED':
    case 'CLASS_APPLICATION_REJECTED':
      return 'Class';
    case 'TUTOR_ROLE_REVOKED':
      return 'Access';
    case 'TUTOR_INVITATION_ACCEPTED':
      return 'Invite';
    default:
      return 'Update';
  }
}

function NotificationsPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<NotificationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  async function load(firstPage = 0): Promise<void> {
    setLoading(true);
    setError('');
    try {
      const response = await listMyNotifications({ page: firstPage, size: 20, sort: 'createdAt,desc' });
      setItems(response.items);
      setPage(response.page);
      setHasNext(response.hasNext);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load notifications'));
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkRead(id: string): Promise<void> {
    setError('');
    try {
      await markNotificationRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      emitLocalEvent('NOTIFICATIONS_CHANGED');
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to mark notification as read'));
    }
  }

  async function handleMarkAllRead(): Promise<void> {
    setError('');
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      emitLocalEvent('NOTIFICATIONS_CHANGED');
      showToast('All notifications marked as read', 'success');
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to mark all as read'));
    }
  }

  async function handleDelete(id: string): Promise<void> {
    setError('');
    try {
      await deleteNotification(id);
      setItems((prev) => prev.filter((n) => n.id !== id));
      emitLocalEvent('NOTIFICATIONS_CHANGED');
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to delete notification'));
    }
  }

  async function handleLoadMore(): Promise<void> {
    if (!hasNext || loadingMore) {
      return;
    }
    setLoadingMore(true);
    setError('');
    try {
      const nextPage = page + 1;
      const response = await listMyNotifications({ page: nextPage, size: 20, sort: 'createdAt,desc' });
      setItems((prev) => [...prev, ...response.items]);
      setPage(response.page);
      setHasNext(response.hasNext);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load more notifications'));
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    load();
    const unsubscribe = realtimeEventBus.subscribe('NOTIFICATION_CREATED', () => {
      window.setTimeout(() => load(0), 250);
    });
    return () => unsubscribe();
  }, []);

  const visibleItems = showUnreadOnly ? items.filter((n) => !n.read) : items;
  const hasUnread = items.some((n) => !n.read);

  return (
    <div className="stack-16">
      <PageHeader
        title="Notifications"
        subtitle="Updates from sessions, payouts, and class workflows."
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowUnreadOnly((v) => !v)}>
              {showUnreadOnly ? 'Show all' : 'Unread only'}
            </Button>
            <Button variant="ghost" size="sm" disabled={!hasUnread} onClick={handleMarkAllRead}>
              Mark all read
            </Button>
            <Button variant="secondary" size="sm" onClick={() => load(0)} loading={loading}>
              Refresh
            </Button>
          </>
        }
      />
      <PageSection>
        {loading ? <Spinner label="Loading notifications..." /> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {!loading && !visibleItems.length ? (
          <EmptyState title="No notifications" description={showUnreadOnly ? 'You have no unread notifications.' : 'Nothing to show yet.'} />
        ) : null}
        {!!visibleItems.length ? (
          <div className="notification-list">
            {visibleItems.map((item) => (
              <article key={item.id} className={`notification-item${item.read ? ' read' : ' unread'}`}>
                <div>
                  <div className="notification-meta">
                    <StatusPill label={formatNotificationType(item.type)} tone="neutral" />
                    <span className="muted small">{formatDate(item.createdAt)}</span>
                  </div>
                  <h3 className="feed-item-title">{item.title}</h3>
                  <p className="notification-content">{item.content}</p>
                </div>
                <div className="notification-actions">
                  {!item.read ? (
                    <Button variant="ghost" size="sm" onClick={() => handleMarkRead(item.id)}>
                      Mark read
                    </Button>
                  ) : null}
                  <button
                    type="button"
                    className="icon-btn icon-btn-danger"
                    title="Delete notification"
                    aria-label="Delete notification"
                    onClick={() => handleDelete(item.id)}
                  >
                    ✕
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
        {hasNext ? (
          <div className="form-actions mt-12">
            <Button variant="ghost" onClick={handleLoadMore} loading={loadingMore}>
              Load more
            </Button>
          </div>
        ) : null}
      </PageSection>
    </div>
  );
}

export default NotificationsPage;
