import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { navigationItems } from '../../config/navigation';
import { AppRole } from '../../types/app';
import { clearAuthSession, getAuthUser } from '../../utils/storage';
import { logout } from '../../services/authService';
import { clearRoleCache } from '../../services/accessService';

interface AppShellProps {
  roles: AppRole[];
  children?: ReactNode;
}

function includesAnyRole(itemRoles: AppRole[], currentRoles: AppRole[]): boolean {
  return itemRoles.some((role) => currentRoles.includes(role));
}

function AppShell({ roles, children }: AppShellProps) {
  const user = getAuthUser();
  const navigate = useNavigate();
  const navItems = navigationItems.filter((item) => includesAnyRole(item.roles, roles));

  async function handleLogout(): Promise<void> {
    try {
      await logout();
    } finally {
      clearRoleCache();
      clearAuthSession();
      navigate('/');
    }
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-brand">
          <h2 className="title">TutorMS</h2>
          <p className="muted">Operations portal</p>
        </div>
        <nav className="app-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="app-main">
        <header className="app-header">
          <div>
            <h1 className="title app-header-title">Tutor Management System</h1>
            <p className="subtitle">Welcome {user?.name || user?.email || 'User'}</p>
          </div>
          <button className="btn btn-outline app-logout" type="button" onClick={handleLogout}>
            Logout
          </button>
        </header>
        <section className="app-content">
          {children}
          <Outlet />
        </section>
      </main>
    </div>
  );
}

export default AppShell;
