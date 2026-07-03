import { ReactNode } from 'react';

interface PageToolbarProps {
  children: ReactNode;
}

function PageToolbar({ children }: PageToolbarProps) {
  return <div className="page-toolbar">{children}</div>;
}

export default PageToolbar;
