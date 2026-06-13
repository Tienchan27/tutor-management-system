import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { AppRole } from '../../types/app';
import { ROLE_ORDER, roleLabel } from '../../utils/roleNavigation';

interface AppUserMenuProps {
  name: string;
  email?: string;
  roles: AppRole[];
  activeRole: AppRole;
  switching?: boolean;
  onRoleSelect: (role: AppRole) => void;
  onSignOut: () => void;
  variant?: 'header' | 'sidebar';
}

function AppUserMenu({
  name,
  email,
  roles,
  activeRole,
  switching,
  onRoleSelect,
  onSignOut,
  variant = 'header',
}: AppUserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const initial = (name || email || 'U').charAt(0).toUpperCase();
  const orderedRoles = ROLE_ORDER.filter((role) => roles.includes(role));

  useEffect(() => {
    function handleClick(event: MouseEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  return (
    <div className={`app-user-menu ${variant === 'sidebar' ? 'app-user-menu-sidebar' : ''}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="app-user-menu-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="app-user-avatar" aria-hidden="true">
          {initial}
        </span>
        <span className="app-user-menu-name">{name}</span>
        <ChevronDown size={14} aria-hidden="true" className="app-user-menu-chevron" />
      </button>
      {open ? (
        <div className="app-user-menu-panel" role="menu">
          {email ? <p className="app-user-menu-heading">{email}</p> : null}
          {roles.length > 1 ? (
            <>
              <p className="app-user-menu-heading">View as</p>
              {orderedRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  role="menuitemradio"
                  aria-checked={activeRole === role}
                  className={`app-user-menu-item ${activeRole === role ? 'active' : ''}`}
                  disabled={switching}
                  onClick={() => {
                    onRoleSelect(role);
                    setOpen(false);
                  }}
                >
                  {roleLabel(role)}
                </button>
              ))}
              <hr className="app-user-menu-divider" />
            </>
          ) : null}
          <Link to="/app/account" className="app-user-menu-item" role="menuitem" onClick={() => setOpen(false)}>
            Account
          </Link>
          <button
            type="button"
            className="app-user-menu-item app-user-menu-item-danger"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default AppUserMenu;
