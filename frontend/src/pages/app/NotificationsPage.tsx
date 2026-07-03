import { useState } from 'react';
import PageLayout from '../../components/layout/PageLayout';
import PageSection from '../../components/layout/PageSection';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import NotificationListItem from '../../components/notifications/NotificationListItem';
import { useNotifications } from '../../components/notifications/useNotifications';

function NotificationsPage() {
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const {
    items,
    hasUnread,
    loading,
    error,
    isFetching,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
    markAllRead,
    deleteNotification,
    markAllPending,
  } = useNotifications({ unreadOnly: showUnreadOnly });

  return (
    <PageLayout
      title="Notifications"
      subtitle="All updates from sessions, payouts, and class workflows."
      headerActions={
        <>
          <Button variant="ghost" size="sm" onClick={() => setShowUnreadOnly((v) => !v)}>
            {showUnreadOnly ? 'Show all' : 'Unread only'}
          </Button>
          <Button variant="ghost" size="sm" disabled={!hasUnread || markAllPending} onClick={() => markAllRead()}>
            Mark all read
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void refetch()} loading={isFetching && !isFetchingNextPage}>
            Refresh
          </Button>
        </>
      }
    >
      <PageSection>
        {loading ? <Spinner label="Loading notifications..." /> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {!loading && !items.length ? (
          <EmptyState
            title="No notifications"
            description={showUnreadOnly ? 'You have no unread notifications.' : 'Nothing to show yet.'}
          />
        ) : null}
        {!!items.length ? (
          <div className="notification-list">
            {items.map((item) => (
              <NotificationListItem
                key={item.id}
                item={item}
                showDelete
                onDelete={() => deleteNotification(item.id)}
              />
            ))}
          </div>
        ) : null}
        {hasNextPage ? (
          <div className="form-actions mt-12">
            <Button variant="ghost" onClick={() => void fetchNextPage()} loading={isFetchingNextPage}>
              Load more
            </Button>
          </div>
        ) : null}
      </PageSection>
    </PageLayout>
  );
}

export default NotificationsPage;
