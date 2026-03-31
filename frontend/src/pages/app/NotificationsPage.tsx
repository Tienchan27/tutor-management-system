import { useEffect, useState } from 'react';
import { listMyNotifications, markNotificationRead } from '../../services/notificationService';
import { NotificationResponse } from '../../types/notifications';
import { extractApiErrorMessage } from '../../services/authService';

function NotificationsPage() {
  const [items, setItems] = useState<NotificationResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  async function load(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      const response = await listMyNotifications();
      setItems(response);
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
      await load();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to mark notification as read'));
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="card">
      <h2 className="title title-lg">Notifications</h2>
      <p className="subtitle">Track updates from session changes and payout events.</p>
      {loading ? <p className="muted">Loading...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      {!loading && !items.length ? <p className="muted">No notifications yet.</p> : null}
      {!!items.length ? (
        <div className="notification-list">
          {items.map((item) => (
            <article key={item.id} className={`notification-item ${item.read ? 'read' : 'unread'}`}>
              <div>
                <h3 className="section-title">{item.title}</h3>
                <p className="muted">{item.content}</p>
                <p className="muted small">{new Date(item.createdAt).toLocaleString()}</p>
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
    </div>
  );
}

export default NotificationsPage;
