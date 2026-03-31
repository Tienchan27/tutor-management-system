import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { navigationItems } from '../../config/navigation';
import { AppRole } from '../../types/app';
import { clearAuthSession, getAuthUser } from '../../utils/storage';
import { logout, switchRole } from '../../services/authService';
import { clearRoleCache } from '../../services/accessService';

interface AppShellProps {
  roles: AppRole[];
  children?: ReactNode;
}

function AppShell({ roles, children }: AppShellProps) {
  const user = getAuthUser();
  const navigate = useNavigate();
  const activeRole = user?.activeRole || roles[0];
  const navItems = navigationItems.filter((item) => activeRole && item.roles.includes(activeRole));

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
    if (!roles.includes(nextRole)) {
      return;
    }
    await switchRole(nextRole);
    clearRoleCache();
    navigate('/app', { replace: true });
  }

  function roleLabel(role: AppRole): string {
    if (role === 'ADMIN') {
      return 'Admin';
    }
    if (role === 'TUTOR') {
      return 'Tutor';
    }
    return 'Student';
  }

  const roleSelectClassName = `text-input role-select ${
    activeRole === 'ADMIN' ? 'role-select-admin' : activeRole === 'TUTOR' ? 'role-select-tutor' : 'role-select-student'
  }`;

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
            <h1 className="title app-header-title title-accent">Tutor Management System</h1>
            <p className="subtitle">Welcome {user?.name || user?.email || 'User'}</p>
          </div>
          <div className="toolbar">
            {roles.length > 1 ? (
              <div className="role-switch">
                <select
                  className={roleSelectClassName}
                  value={activeRole}
                  onChange={(event) => handleRoleSwitch(event.target.value as AppRole)}
                  aria-label="Switch role"
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {roleLabel(role)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <button className="btn btn-brand app-logout" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
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
