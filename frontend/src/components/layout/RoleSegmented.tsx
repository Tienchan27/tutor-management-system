import { AppRole } from '../../types/app';
import { ROLE_ORDER, roleLabel } from '../../utils/roleNavigation';

interface RoleSegmentedProps {
  roles: AppRole[];
  activeRole: AppRole;
  disabled?: boolean;
  onSelect: (role: AppRole) => void;
}

function RoleSegmented({ roles, activeRole, disabled, onSelect }: RoleSegmentedProps) {
  if (roles.length <= 1) {
    return null;
  }

  const ordered = ROLE_ORDER.filter((role) => roles.includes(role));

  return (
    <div className="role-segmented" role="radiogroup" aria-label="Switch role">
      {ordered.map((role) => (
        <button
          key={role}
          type="button"
          role="radio"
          aria-checked={activeRole === role}
          className={`role-segmented-btn ${activeRole === role ? 'active' : ''}`}
          disabled={disabled || activeRole === role}
          onClick={() => onSelect(role)}
        >
          {roleLabel(role)}
        </button>
      ))}
    </div>
  );
}

export default RoleSegmented;
