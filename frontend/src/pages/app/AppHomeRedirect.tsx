import { Navigate } from 'react-router-dom';
import { useAppAccess } from '../../context/AppAccessContext';
import { getAuthUser } from '../../utils/storage';
import { getRoleHomePath } from '../../utils/roleNavigation';

function AppHomeRedirect() {
  const { roles } = useAppAccess();
  const activeRole = getAuthUser()?.activeRole;

  if (activeRole) {
    return <Navigate to={getRoleHomePath(activeRole)} replace />;
  }
  if (roles.includes('ADMIN')) {
    return <Navigate to="/app/admin/dashboard" replace />;
  }
  if (roles.includes('TUTOR')) {
    return <Navigate to="/app/tutor/home" replace />;
  }
  return <Navigate to="/app/student/home" replace />;
}

export default AppHomeRedirect;
