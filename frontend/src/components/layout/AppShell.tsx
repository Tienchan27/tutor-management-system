import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ReactNode, Suspense, useState } from 'react';
import { Menu } from 'lucide-react';
import { getNavigationGroups } from '../../config/navigation';
import { AppRole } from '../../types/app';
import { clearAuthSession, getAuthUser } from '../../utils/storage';
import { logout, switchRole } from '../../services/authService';
import { clearRoleCache } from '../../services/accessService';
import { getRoleHomePath, roleLabel } from '../../utils/roleNavigation';
import { useToast } from '../feedback/ToastProvider';
import AppUserMenu from './AppUserMenu';
import AppLoadingSkeleton from './AppLoadingSkeleton';
import NotificationBell from '../notifications/NotificationBell';

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
  const navGroups = activeRole ? getNavigationGroups(activeRole) : [];

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

  const sidebarContent = (
    <>
      <div className="app-brand">
        <span className="app-brand-logo" aria-hidden="true">
          <span className="app-brand-logo-fallback">H</span>
          <img src="/brand/logo.png" alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        </span>
        <div className="app-brand-text">
          <h2 className="app-brand-title">Hands for Hands</h2>
          <p className="app-brand-tagline">Tutor platform</p>
        </div>
      </div>
      <nav className="app-nav">
        {navGroups.map((group, groupIndex) => (
          <div key={`${group.group ?? 'main'}-${groupIndex}`} className="app-nav-group">
            {group.group ? <p className="app-nav-group-label">{group.group}</p> : null}
            {group.items.map((item) => {
              const Icon = item.icon;
              if (item.disabled) {
                return (
                  <span key={item.path} className="app-nav-link app-nav-link-disabled" aria-disabled="true">
                    {Icon ? <Icon size={16} aria-hidden="true" /> : null}
                    <span className="app-nav-link-label">{item.label}</span>
                    <span className="nav-soon-badge">Soon</span>
                  </span>
                );
              }
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setDrawerOpen(false)}
                >
                  {Icon ? <Icon size={16} aria-hidden="true" /> : null}
                  <span className="app-nav-link-label">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
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
          <div className="app-header-actions">
            <NotificationBell />
            <div className="app-header-mobile-only">
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
