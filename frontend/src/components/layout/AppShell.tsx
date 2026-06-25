import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ReactNode, Suspense, useState } from 'react';
import { Menu } from 'lucide-react';
import { navigationItems } from '../../config/navigation';
import { AppRole } from '../../types/app';
import { clearAuthSession, getAuthUser } from '../../utils/storage';
import { logout, switchRole } from '../../services/authService';
import { clearRoleCache } from '../../services/accessService';
import { getRoleHomePath, roleLabel } from '../../utils/roleNavigation';
import { useToast } from '../feedback/ToastProvider';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import AppUserMenu from './AppUserMenu';
import AppLoadingSkeleton from './AppLoadingSkeleton';

interface AppShellProps {
  roles: AppRole[];
  children?: ReactNode;
}

function AppShell({ roles, children }: AppShellProps) {
  const user = getAuthUser();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const activeRole = user?.activeRole || roles[0];
  const navItems = navigationItems.filter((item) => {
    if (!activeRole || !item.roles.includes(activeRole)) {
      return false;
    }
    if (item.disabled) {
      return false;
    }
    return true;
  });

  async function handleLogout(): Promise<void> {
    try {
      await logout();
    } finally {
      clearRoleCache();
      clearAuthSession();
      navigate('/');
    }
  }

  async function handleRoleSwitch(nextRole: AppRole): Promise<void> {
    if (!roles.includes(nextRole) || nextRole === activeRole) {
      return;
    }
    setSwitching(true);
    try {
      await switchRole(nextRole);
      clearRoleCache();
      showToast(`Switched to ${roleLabel(nextRole)} view`, 'success');
      navigate(getRoleHomePath(nextRole), { replace: true });
      setDrawerOpen(false);
    } catch {
      showToast('Failed to switch role. Please try again.', 'error');
    } finally {
      setSwitching(false);
    }
  }

  const displayName = user?.name || user?.email || 'User';
  const unreadCount = useUnreadNotifications();

  const sidebarContent = (
    <>
      <div className="app-brand">
        <span className="app-brand-logo" aria-hidden="true">
          <span className="app-brand-logo-fallback">H</span>
          <img src="/brand/logo.png" alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        </span>
        <div className="app-brand-text">
          <h2 className="title">Hands for Hands</h2>
          <p className="muted">Tutor management</p>
        </div>
      </div>
      <nav className="app-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const badge = item.path === '/app/notifications' ? unreadCount : 0;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setDrawerOpen(false)}
            >
              {Icon ? <Icon size={16} aria-hidden="true" /> : null}
              <span className="app-nav-link-label">{item.label}</span>
              {badge > 0 ? (
                <span
                  className="nav-badge"
                  aria-label={`${badge} unread notification${badge === 1 ? '' : 's'}`}
                >
                  {badge > 20 ? '20+' : badge}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </nav>
      <div className="app-sidebar-footer">
        <AppUserMenu
          variant="sidebar"
          name={displayName}
          email={user?.email}
          roles={roles}
          activeRole={activeRole}
          switching={switching}
          onRoleSelect={handleRoleSwitch}
          onSignOut={handleLogout}
        />
      </div>
    </>
  );

  return (
    <div className={`app-shell ${drawerOpen ? 'app-shell-drawer-open' : ''}`}>
      <aside className="app-sidebar app-sidebar-desktop">{sidebarContent}</aside>

      {drawerOpen ? (
        <button type="button" className="app-drawer-backdrop" aria-label="Close menu" onClick={() => setDrawerOpen(false)} />
      ) : null}
      <aside className={`app-sidebar app-sidebar-drawer ${drawerOpen ? 'open' : ''}`} aria-hidden={!drawerOpen}>
        {sidebarContent}
      </aside>

      <main className="app-main">
        <header className="app-header">
          <button
            type="button"
            className="app-menu-btn"
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((value) => !value)}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <div className="app-header-spacer" />
          <div className="app-header-actions app-header-mobile-only">
            <AppUserMenu
              name={displayName}
              email={user?.email}
              roles={roles}
              activeRole={activeRole}
              switching={switching}
              onRoleSelect={handleRoleSwitch}
              onSignOut={handleLogout}
            />
          </div>
        </header>
        <section className="app-content">
          <Suspense fallback={<AppLoadingSkeleton />}>
            {children}
            <Outlet />
          </Suspense>
        </section>
      </main>
    </div>
  );
}

export default AppShell;
