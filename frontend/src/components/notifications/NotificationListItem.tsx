import { NotificationResponse } from '../../types/notifications';
import StatusPill from '../ui/StatusPill';
import { formatDate } from '../../utils/format';
import { formatNotificationType } from './notificationNavigation';

interface NotificationListItemProps {
  item: NotificationResponse;
  compact?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
}

function NotificationListItem({ item, compact, onClick, onDelete, showDelete }: NotificationListItemProps) {
  const content = (
    <>
      <div className="notification-meta">
        <StatusPill label={formatNotificationType(item.type)} tone="neutral" />
        <span className="muted small">{formatDate(item.createdAt)}</span>
      </div>
      <h3 className={`feed-item-title${compact ? ' feed-item-title-compact' : ''}`}>{item.title}</h3>
      <p className={`notification-content${compact ? ' notification-content-compact' : ''}`}>{item.content}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`notification-item notification-item-button${item.read ? ' read' : ' unread'}`}
        onClick={onClick}
      >
        <div className="notification-item-body">{content}</div>
      </button>
    );
  }

  return (
    <article className={`notification-item${item.read ? ' read' : ' unread'}`}>
      <div className="notification-item-body">{content}</div>
      {showDelete && onDelete ? (
        <div className="notification-actions">
          <button
            type="button"
            className="icon-btn icon-btn-danger"
            title="Delete notification"
            aria-label="Delete notification"
            onClick={onDelete}
          >
            ✕
          </button>
        </div>
      ) : null}
    </article>
  );
}

export default NotificationListItem;
