import { ReactNode } from 'react';

interface PageSectionProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

function PageSection({ title, subtitle, actions, children }: PageSectionProps) {
  return (
    <section className="card page-section-card">
      {title || subtitle || actions ? (
        <div className="section-header">
          <div>
            {title ? <h2 className="section-title">{title}</h2> : null}
            {subtitle ? <p className="subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="section-actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export default PageSection;
