import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
}

function Badge({ children }: BadgeProps) {
  return <span className="badge">{children}</span>;
}

export default Badge;
