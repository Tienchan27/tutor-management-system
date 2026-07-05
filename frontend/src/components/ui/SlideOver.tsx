import { ReactNode, useId, useRef } from 'react';
import { useOverlayDialog } from '../../hooks/useOverlayDialog';
import { useDismissGuard } from '../../hooks/useDismissGuard';
import ConfirmDialog from '../feedback/ConfirmDialog';

type SlideOverFooter = ReactNode | ((requestClose: () => void) => ReactNode);

interface SlideOverProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: SlideOverFooter;
  size?: 'md' | 'lg';
  isDirty?: boolean;
  closeOnBackdrop?: boolean;
}

function SlideOver({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = 'md',
  isDirty = false,
  closeOnBackdrop = true,
}: SlideOverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { requestClose, discardDialog } = useDismissGuard(open, isDirty, onClose);

  useOverlayDialog(open, requestClose, panelRef);

  if (!open) {
    return null;
  }

  const resolvedFooter = typeof footer === 'function' ? footer(requestClose) : footer;

  return (
    <>
      {closeOnBackdrop ? (
        <button type="button" className="slide-over-overlay" aria-label="Close panel" onClick={requestClose} />
      ) : (
        <div className="slide-over-overlay" aria-hidden="true" />
      )}
      <div
        ref={panelRef}
        className={`slide-over-panel${size === 'lg' ? ' slide-over-panel-lg' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="slide-over-header">
          <div>
            <h2 id={titleId} className="slide-over-title">
              {title}
            </h2>
            {subtitle ? <p className="muted mb-0">{subtitle}</p> : null}
          </div>
          <button type="button" className="slide-over-close" aria-label="Close" onClick={requestClose}>
            ×
          </button>
        </div>
        <div className="slide-over-body">{children}</div>
        {resolvedFooter ? <div className="slide-over-actions">{resolvedFooter}</div> : null}
      </div>
      <ConfirmDialog
        open={discardDialog.open}
        title="Discard changes?"
        message="You have unsaved changes. Discard them and close?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        danger
        onConfirm={discardDialog.onConfirm}
        onCancel={discardDialog.onCancel}
      />
    </>
  );
}

export default SlideOver;
