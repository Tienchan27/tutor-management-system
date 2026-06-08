import { ReactNode, useEffect, useRef } from 'react';

interface SlideOverProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

function SlideOver({ open, title, subtitle, onClose, children, footer }: SlideOverProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handleKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKey);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <>
      <button type="button" className="slide-over-overlay" aria-label="Close panel" onClick={onClose} />
      <div
        ref={panelRef}
        className="slide-over-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="slide-over-title"
        tabIndex={-1}
      >
        <div className="slide-over-header">
          <div>
            <h2 id="slide-over-title" className="slide-over-title">
              {title}
            </h2>
            {subtitle ? <p className="muted mb-0">{subtitle}</p> : null}
          </div>
          <button type="button" className="slide-over-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="slide-over-body">{children}</div>
        {footer ? <div className="slide-over-actions">{footer}</div> : null}
      </div>
    </>
  );
}

export default SlideOver;
