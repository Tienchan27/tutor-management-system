import { useEffect, useState } from 'react';
import { listMyNotifications, markNotificationRead } from '../../services/notificationService';
import { NotificationResponse } from '../../types/notifications';
import { extractApiErrorMessage } from '../../services/authService';
import { realtimeEventBus } from '../../services/realtimeEventBus';

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
  const [items, setItems] = useState<NotificationResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showUnreadOnly, setShowUnreadOnly] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const [hasNext, setHasNext] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

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
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to mark notification as read'));
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
      window.setTimeout(() => {
        load(0);
      }, 250);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const visibleItems = showUnreadOnly ? items.filter((n) => !n.read) : items;

  return (
    <div className="card">
      <h2 className="title title-lg">Notifications</h2>
      <p className="subtitle">Track updates from session changes and payout events.</p>
      <div className="notification-toolbar">
        <button type="button" className="btn btn-soft compact-btn" onClick={() => setShowUnreadOnly((v) => !v)}>
          {showUnreadOnly ? 'Showing: Unread' : 'Showing: All'}
        </button>
        <button type="button" className="btn btn-soft compact-btn" onClick={() => load(0)} disabled={loading}>
          Refresh
        </button>
      </div>
      {loading ? <p className="muted">Loading...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      {!loading && !visibleItems.length ? <p className="muted">No notifications yet.</p> : null}
      {!!visibleItems.length ? (
        <div className="notification-list">
          {visibleItems.map((item) => (
            <article key={item.id} className={`notification-item ${item.read ? 'read' : 'unread'}`}>
              <div>
                <div className="notification-meta">
                  <span className="notification-badge">{formatNotificationType(item.type)}</span>
                  <span className="muted small">{new Date(item.createdAt).toLocaleString()}</span>
                </div>
                <h3 className="section-title">{item.title}</h3>
                <p className="muted">{item.content}</p>
              </div>
              {!item.read ? (
                <button type="button" className="btn btn-soft-teal compact-btn" onClick={() => handleMarkRead(item.id)}>
                  Mark as read
                </button>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {hasNext ? (
        <div className="mt-12">
          <button type="button" className="btn btn-soft" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default NotificationsPage;
