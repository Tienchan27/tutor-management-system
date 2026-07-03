import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import SlideOver from '../ui/SlideOver';
import NotificationPanel from './NotificationPanel';

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const unreadCount = useUnreadNotifications();

  useEffect(() => {
    function handleResize(): void {
      setIsMobile(window.matchMedia('(max-width: 920px)').matches);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!open || isMobile) return;
    function handleClick(event: MouseEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, isMobile]);

  const badgeLabel =
    unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'No unread notifications';

  return (
    <>
      <div className="notification-bell" ref={rootRef}>
        <button
          type="button"
          className="notification-bell-trigger"
          aria-label={badgeLabel}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((v) => !v)}
        >
          <Bell size={18} aria-hidden="true" />
          {unreadCount > 0 ? (
            <span className="notification-bell-badge" aria-hidden="true">
              {unreadCount > 20 ? '20+' : unreadCount}
            </span>
          ) : null}
        </button>
        {open && !isMobile ? (
          <div className="notification-bell-popover" role="dialog" aria-label="Notifications">
            <NotificationPanel onNavigate={() => setOpen(false)} />
          </div>
        ) : null}
      </div>

      <SlideOver open={open && isMobile} title="Notifications" onClose={() => setOpen(false)}>
        <NotificationPanel onNavigate={() => setOpen(false)} />
      </SlideOver>
    </>
  );
}

export default NotificationBell;
