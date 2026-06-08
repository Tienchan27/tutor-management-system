import { ReactNode } from 'react';

interface SectionBlockProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

function SectionBlock({ title, subtitle, actions, children }: SectionBlockProps) {
  return (
    <section className="section-block">
      {title || subtitle || actions ? (
        <div className="section-header">
          <div>
            {title ? <h3 className="section-title">{title}</h3> : null}
            {subtitle ? <p className="subtitle mb-0">{subtitle}</p> : null}
          </div>
          {actions ? <div className="section-actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export default SectionBlock;
