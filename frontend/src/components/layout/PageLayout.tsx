import { ReactNode } from 'react';
import PageHeader from '../ui/PageHeader';
import PageToolbar from './PageToolbar';

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
}

function PageLayout({ title, subtitle, headerActions, toolbar, children }: PageLayoutProps) {
  return (
    <div className="stack-16">
      <PageHeader title={title} subtitle={subtitle} actions={headerActions} />
      {toolbar ? <PageToolbar>{toolbar}</PageToolbar> : null}
      {children}
    </div>
  );
}

export default PageLayout;
