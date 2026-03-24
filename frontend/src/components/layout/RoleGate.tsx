import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { AppRole } from '../../types/app';
import { useAppAccess } from '../../context/AppAccessContext';

interface RoleGateProps {
  allowed: AppRole[];
  children: ReactNode;
}

function RoleGate({ allowed, children }: RoleGateProps) {
  const { roles } = useAppAccess();
  const canAccess = allowed.some((role) => roles.includes(role));
  if (!canAccess) {
    return <Navigate to="/app/unauthorized" replace />;
  }
  return <>{children}</>;
}

export default RoleGate;
