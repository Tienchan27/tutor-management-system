import { Link, useNavigate } from 'react-router-dom';
import { AppRole } from '../../types/app';
import { getAuthUser } from '../../utils/storage';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import EmptyState from '../ui/EmptyState';
import NotificationListItem from './NotificationListItem';
import { getNotificationHref } from './notificationNavigation';
import { useNotifications } from './useNotifications';

interface NotificationPanelProps {
  limit?: number;
  onNavigate?: () => void;
}

function NotificationPanel({ limit = 15, onNavigate }: NotificationPanelProps) {
  const navigate = useNavigate();
  const activeRole = getAuthUser()?.activeRole as AppRole | undefined;
  const { items, hasUnread, loading, markRead, markAllRead, markAllPending } = useNotifications({
    pageSize: limit,
  });

  const visibleItems = items.slice(0, limit);

  function handleItemClick(id: string, type: string, read: boolean): void {
    if (!read) {
      markRead(id);
    }
    const href = getNotificationHref(type, activeRole);
    if (href) {
      onNavigate?.();
      navigate(href);
    }
  }

  return (
    <div className="notification-panel">
      <div className="notification-panel-header">
        <h2 className="notification-panel-title">Notifications</h2>
      </div>
      <div className="notification-panel-body">
        {loading ? <Spinner label="Loading..." /> : null}
        {!loading && !visibleItems.length ? (
          <EmptyState title="No notifications" description="You're all caught up." />
        ) : null}
        {!!visibleItems.length ? (
          <div className="notification-list notification-list-compact">
            {visibleItems.map((item) => (
              <NotificationListItem
                key={item.id}
                item={item}
                compact
                onClick={() => handleItemClick(item.id, item.type, item.read)}
              />
            ))}
          </div>
        ) : null}
      </div>
      <div className="notification-panel-footer">
        <Button variant="ghost" size="sm" disabled={!hasUnread || markAllPending} onClick={() => markAllRead()}>
          Mark all read
        </Button>
        <Link to="/app/notifications" className="btn btn-ghost btn-sm" onClick={onNavigate}>
          View all
        </Link>
      </div>
    </div>
  );
}

export default NotificationPanel;
