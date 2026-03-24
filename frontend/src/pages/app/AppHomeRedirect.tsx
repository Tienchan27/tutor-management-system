import { Navigate } from 'react-router-dom';
import { useAppAccess } from '../../context/AppAccessContext';

function AppHomeRedirect() {
  const { roles } = useAppAccess();
  if (roles.includes('ADMIN')) {
    return <Navigate to="/app/admin/dashboard" replace />;
  }
  if (roles.includes('TUTOR')) {
    return <Navigate to="/app/tutor/dashboard" replace />;
  }
  return <Navigate to="/app/student/classes" replace />;
}

export default AppHomeRedirect;
